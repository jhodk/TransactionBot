const {
	Client,
	GatewayIntentBits,
    Partials,
    EmbedBuilder,
    UserContextMenuCommandInteraction
} = require('discord.js');
const util = require('util');

const configPath = "../config/config.json";
const config = require(configPath);
const moment = require('moment');
const fetch = require('node-fetch');
const fs = require('fs');
const TransactionBot = new Client({
	intents:[GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageReactions],
	partials:[Partials.Message, Partials.Channel, Partials.Reaction]
});
const accessTokenEmojis = ["🔑", "🎹", "⚓"];
let transactionPollingTimer;
startBot();
async function startBot() {
    await TransactionBot.login(config.discord_bot_token);
    console.log("Transaction bot logged in");
    //cache user dm channels so that reactions will fire an event
    for(const user of config.users) {
        const tmp = await TransactionBot.users.fetch(user.discord_user_id);
    }
    let discordUser = await TransactionBot.users.fetch(config.adminDiscordUser.discord_user_id);
    discordUser.send("Transaction bot restarted");
    transactionPollingTimer = setInterval(transactionsLoop, 1000*60*15);
    transactionsLoop();
}

async function transactionsLoop() {
    for(const user of config.users) {
        updateUserTransactions(user);
    }
}

async function updateUserTransactions(user) {
  for(const bank_account of user.bank_accounts) {
    let transactions = await APIGetBankAccountTransactions(user, bank_account);

    if(!transactions || transactions.error) {
        console.log(transactions.error);
        console.log(`error getting transaction for user ${user.name}, refreshing token...`);
        let success = await APIRefreshToken(user, bank_account.truelayer_token_index);
        if(!success){
            console.log(`Error with access token ${bank_account.truelayer_token_index}. Prompted user ${user.name} to generate new code`);
        }
        else{
            transactions = await APIGetBankAccountTransactions(user, bank_account);
            await handleBankAccountTransactions(transactions, user, bank_account);
        }
    }
    else{
        await handleBankAccountTransactions(transactions, user, bank_account);
    }
  }

  for(const credit_card of user.credit_cards) {
      let transactions = await APIGetCreditCardTransactions(user, credit_card);

      if(!transactions || transactions.error) {
          console.log(`error getting transaction for user ${user.name}, refreshing token...`);
          let success = await APIRefreshToken(user, credit_card.truelayer_token_index);
          if(!success){
              console.log(`Error with access token ${credit_card.truelayer_token_index}. Prompted user ${user.name} to generate new code`);
          }
          else{
              transactions = await APIGetCreditCardTransactions(user, credit_card);
              await handleCreditCardTransactions(transactions, user, credit_card);
          }
      }
      else{
          await handleCreditCardTransactions(transactions, user, credit_card);
      }
  }
}

function isTransactionAlreadyRecorded(transaction, bank_or_credit_account) {
    return bank_or_credit_account.latest_transactions.some((knownTransaction) => 
        knownTransaction.transaction_id === transaction.transaction_id ||
        (
            knownTransaction.description.trim() === transaction.description.trim() &&
            knownTransaction.amount === -Number.parseFloat(transaction.amount)
        )
    );
}

async function handleBankAccountTransactions(transactionsObj, user, bank_account) {
    if(!transactionsObj.results) {
        console.log(`Bank Account Transactions API returned unexpected format for user ${user.name} and bank account ${bank_account.name}:`);
        console.log(transactionsObj);
        return;
    }
    if(transactionsObj.results.length == 0){
        return;
    }
    const transactions = Array.from(transactionsObj.results);

    // ignore transactions that are already known
    const newTransactions = transactions.filter(transaction => !isTransactionAlreadyRecorded(transaction, bank_account));

    if(newTransactions.length == 0){
        return;
    }

    const latestTimestamp = newTransactions.reduce((memo, next) => 
        new Date(next.timestamp) > new Date(memo.timestamp) ? next : memo
    ).timestamp;

    // clear stored transaction ids if there is a new latest timestamp (assume we don't get transactions from a previous day)
    if(new Date(bank_account.last_transaction_date) < new Date(latestTimestamp)) {
        bank_account.latest_transactions = [];
        bank_account.last_transaction_date = latestTimestamp;
    }

    // add transaction details which match the latest timestamp to the stored array
    const newTransactionDetailsToRemember = newTransactions.filter(transaction => transaction.timestamp === latestTimestamp)
    .map(transaction => ({
        transaction_id: transaction.transaction_id,
        description: transaction.description,
        amount: -Number.parseFloat(transaction.amount),
    }));
    bank_account.latest_transactions.push(...newTransactionDetailsToRemember);

    newTransactions.sort((a, b) => new Date(a.transaction_date) < new Date(b.transaction_date) ? -1 : 1);

    let discordUser = await TransactionBot.users.fetch(user.discord_user_id);
    discordUser.send("===="+bank_account.name+"====\nNew transactions added!")
    for(let transaction of newTransactions){
        await sendTransactionMessage(transaction,discordUser);
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config,null,2));
}

async function handleCreditCardTransactions(transactionsObj, user, credit_card) {
    if(!transactionsObj.results) {
        console.log(`Credit Card Transactions API returned unexpected format for user ${user.name} and credit card ${credit_card.name}:`);
        console.log(transactionsObj);
        return;
    }
    if(transactionsObj.results.length == 0){
        return;
    }
    const transactions = Array.from(transactionsObj.results);

    // ignore transactions that are already known
    const newTransactions = transactions.filter(transaction => !isTransactionAlreadyRecorded(transaction, credit_card));

    if(newTransactions.length == 0){
        return;
    }

    const latestTimestamp = newTransactions.reduce((memo, next) => 
        new Date(next.timestamp) > new Date(memo.timestamp) ? next : memo
    ).timestamp;

    // clear stored transaction ids if there is a new latest timestamp (assume we don't get transactions from a previous day)
    if(new Date(credit_card.last_transaction_date) < new Date(latestTimestamp)) {
        credit_card.latest_transactions = [];
        credit_card.last_transaction_date = latestTimestamp;
    }

    // add transaction details which match the latest timestamp to the stored array
    const newTransactionDetailsToRemember = newTransactions.filter(transaction => transaction.timestamp === latestTimestamp)
    .map(transaction => ({
        transaction_id: transaction.transaction_id,
        description: transaction.description,
        amount: -Number.parseFloat(transaction.amount),
    }));
    credit_card.latest_transactions.push(...newTransactionDetailsToRemember);

    newTransactions.sort((a, b) => new Date(a.transaction_date) < new Date(b.transaction_date) ? -1 : 1);
    
    let discordUser = await TransactionBot.users.fetch(user.discord_user_id);
    discordUser.send("===="+credit_card.name+"====\nNew transactions added!")
    for(let transaction of transactions){
        transaction.amount = -Number.parseFloat(transaction.amount);
        await sendTransactionMessage(transaction,discordUser);
    }

    fs.writeFileSync(configPath, JSON.stringify(config,null,2));
}

async function sendTransactionMessage(transaction,user) {
    const colours = ["#992d22","#F1C40F", "#E91E63", "#2ECC71", "#E67E22", "#3498DB", "#9B59B6"];
    let chosenColor = colours[moment(transaction.timestamp.substring(0,10)).day()];
    let num = -Number.parseFloat(transaction.amount);
    let amount = (Math.round(num * 100) / 100).toFixed(2);
    let date = moment(transaction.timestamp.substring(0,10)).format("dddd Do MMM YYYY")
    const embedMessage = new EmbedBuilder().setTitle("£"+amount.toString())
    .setAuthor({name: date})
    .setColor(chosenColor)
    .setDescription(transaction.description.substring(0,18).trim()+"\n"+transaction.description.substring(18).trim());
    user.send({embeds: [embedMessage]});
}

function getBankAccountNamesForTokenIndex(user, token_index) {
    return user.bank_accounts.filter((bank_account) => bank_account.truelayer_token_index === token_index).map((bank_account) => bank_account.name).join(",");
}

function getCreditCardNamesForTokenIndex(user, token_index) {
    return user.credit_cards.filter((credit_card) => credit_card.truelayer_token_index === token_index).map((credit_card) => credit_card.name).join(",");
}

async function APIRefreshToken(user, token_index) {
    const url = `https://auth.truelayer.com/connect/token`;
    const options = {
      method: "POST",
      headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: config.truelayer.app_client_id,
        client_secret: config.truelayer.app_client_secret,
        refresh_token: user.truelayer.refresh_tokens[token_index]
      })
    };

    let result = await fetch(url, options);
    result = await result.json();
    if(result.error) {
        console.log("ERROR: "+result.error);
        let discordUser = await TransactionBot.users.fetch(user.discord_user_id);
        discordUser.send(`Access token ${token_index} has expired.\n(bank accounts: ${getBankAccountNamesForTokenIndex(user, token_index)}\ncredit cards: ${getCreditCardNamesForTokenIndex(user, token_index)})\nPlease visit this link to get new authorisation code. Send the code as a message then react to the code with the ${accessTokenEmojis[token_index]} emoji.`);
        discordUser.send(`https://auth.truelayer.com/?response_type=code&client_id=${config.truelayer.app_client_id}&scope=info%20accounts%20balance%20cards%20transactions%20direct_debits%20standing_orders%20offline_access&redirect_uri=https://console.truelayer.com/redirect-page&providers=uk-ob-all%20uk-oauth-all`);
        return false;
    }
    config.users.find(u => u.discord_user_id == user.discord_user_id).truelayer.access_tokens[token_index] = result.access_token;
    fs.writeFileSync(configPath, JSON.stringify(config,null,2));
    return true;
}

async function APIExchangeCodeForAccessToken(code, user, token_index) {
    const url = `https://auth.truelayer.com/connect/token`;
    const options = {
      method: 'POST',
      headers: {accept: 'application/json', 'content-type': 'application/json'},
      body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: config.truelayer.app_client_id,
          client_secret: config.truelayer.app_client_secret,
          code: code,
          redirect_uri: 'https://console.truelayer.com/redirect-page'
      })
    };

    let result = await fetch(url, options);
    result = await result.json();

    if(result.error) {
      console.log("ERROR exchanging code for token: "+result.error);
      return false;
    }

    const configUser = user;
    configUser.truelayer.access_tokens[token_index] = result.access_token;
    configUser.truelayer.refresh_tokens[token_index] = result.refresh_token;
    fs.writeFileSync(configPath, JSON.stringify(config,null,2));
    return true;
}

async function APIGetBankAccountTransactions(user, bank_account) {
    const nowDate = moment().format("YYYY-MM-DD")+"T00:00:00Z"; // bank data only had granularity of 1 day. Shows correct date in splitwise UI, although timestamp shown on hover may be previous day 11pm due to time zones
    const url = `https://api.truelayer.com/data/v1/accounts/${bank_account.bank_account_id}/transactions?from=${encodeURIComponent(bank_account.last_transaction_date)}&to=${encodeURIComponent(nowDate)}`;
    const options = {
      method: 'GET',
      headers: {Accept: 'application/json',
              Authorization: 'Bearer '+user.truelayer.access_tokens[bank_account.truelayer_token_index],
              'X-PSU-IP': config.truelayer.app_client_IP
      }
    }; 
    let result = await fetch(url, options);
    result = await result.json();    
    return result;
}

async function APIGetCreditCardTransactions(user, credit_card) {
    const nowDate = moment().format("YYYY-MM-DD")+"T00:00:00Z"; // bank data only had granularity of 1 day. Shows correct date in splitwise UI, although timestamp shown on hover may be previous day 11pm due to time zones
    const url = `https://api.truelayer.com/data/v1/cards/${credit_card.credit_card_id}/transactions?from=${encodeURIComponent(credit_card.last_transaction_date)}&to=${encodeURIComponent(nowDate)}`;
    const options = {
      method: 'GET',
      headers: {Accept: 'application/json',
              Authorization: 'Bearer '+user.truelayer.access_tokens[credit_card.truelayer_token_index],
              'X-PSU-IP': config.truelayer.app_client_IP
      }
    }; 
    let result = await fetch(url, options);
    result = await result.json();    
    return result;
}


//handle reactions to messages
TransactionBot.on('messageReactionAdd', async (reaction, user) => {
    if(user.id !== TransactionBot.user.id && config.users.find(u => u.discord_user_id == user.id) != undefined) {
        if(reaction.partial) {
            try{
                await reaction.fetch();
            } catch(e) {
                console.error("Something went wrong fetching message");
                return;
            }
        }
        //message is now cached fully
        if(reaction.message.author.id == TransactionBot.user.id) {
            if(reaction.emoji.name == "♻️") {
                reaction.message.delete();
            }
            else if(reaction.emoji.name == "🤑" && reaction.message.embeds){
                const success = await makeSplitwiseEntry(reaction.message, config.users.find(u => u.discord_user_id == user.id));
                if(success) {
                    reaction.message.react("✅");
                }
                else {
                    reaction.message.react("⚠");
                }
            }
            else if(reaction.emoji.name == "🔥"){
               reaction.message.reactions.cache.filter(reaction => reaction.users.remove(TransactionBot.user.id));
            }
        }
        else {
          if(accessTokenEmojis.includes(reaction.emoji.name)) {
            const newCode = reaction.message.content;
            const access_token_index = accessTokenEmojis.findIndex((emoji) => emoji == reaction.emoji.name);
            user.send(`Requesting access for token with index ${access_token_index} using code: ${newCode}`);
            const success = await APIExchangeCodeForAccessToken(newCode, config.users.find(u => u.discord_user_id === user.id), access_token_index);
            user.send(`${success ? "Success!" : "That didn't work. Try generating a new code in case it timed out or contact admin."}`);
            
            if(success) {
              updateUserTransactions(config.users.find(u => u.discord_user_id === user.id));
            }
        }
        }
    }
});

async function makeSplitwiseEntry(message, user) {
    if(message.embeds[0]){
        message = message.embeds[0];
        const dateArr = message.data.author.name.split(" "); //Monday 22nd Aug 2022
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        let day = dateArr[1].substring(0,dateArr[1].length-2);
        if(day < 10){day = "0"+day;}
        let month = months.indexOf(dateArr[2])+1;
        if(month < 10) {month = "0"+month;}
        let year = dateArr[3];
        let datetime = `${day}/${month}/${year} 00:00:00`;
        let cost = message.data.title.substring(1);
        let description = message.data.description.replace("\n","/");
        return await APISplitwiseEntry(cost, description, datetime, user);
    }
}

async function APISplitwiseEntry(cost, description, datetime, user) {
    const url = `https://secure.splitwise.com/api/v3.0/create_expense`;
    const options = {
      method: "POST",
      headers: {Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer '+user.splitwise_API_token},
      body: JSON.stringify({
        cost: cost,
        description: description,
        date: datetime,
        repeat_interval: "never",
        currency_code: "GBP",
        category_id: guess_category(description), //general category
        group_id: user.splitwise_group_id,
        split_equally: true
      })
    };
    let result = await fetch(url, options);
    result = await result.json();

    if(result.error){
        console.log("ERROR: "+result.error);
        let discordUser = await TransactionBot.users.fetch(user.discord_user_id);
        discordUser.send("There was an error creating the splitwise expense.");
        return false;
    }
    return true;
}

function guess_category(e) {
    return null == e ? 18 : 
    null != (e = e.toLowerCase()).match(/\brents?\b|\broom\b|\broomrent\b|\bmiete\b|\balquiler\b|\bpiso\b/) ? 3 :
    null != e.match(/\bmortgage\b/) ? 4 :
    null != e.match(/\belec|\bpg&e\b|\bpower\b|\benergy\b|\bcomed\b|\bnstar\b|\bpge\b|\bpg\b|\bxcel\b|\bpeco\b|\belectricity\b|\btabak\b|\bstrom\b|\bstromrechnung\b|\benergie\b|\bluz\b|\biberdrola\b|\bendesa\b/) ? 5 :
    null != e.match(/\binternet\b|\bcomcast\b|\batt\b|\bat&t\b|\bat\b&\bt\b|\bcable\b|\bphone\b|\bnet\b|\btime\b|\bverizon\b|\bwarner\b|\btwc\b|\bcox\b|\bbroadband\b|\bwifi\b|\brcn\b|\bvonage\b|\btmobile\b|\bsprint\b|\bt-mobile\b|\bmodem\b|\bmobile\b|\brecharge\b|\bairtel\b|\breliance\b|\btata docomo\b|\btata sky\b|\btatasky\b|\bvoda|\bgez\b|\bo2\b|\bjazztel\b|\btelefonos?\b|\bmovistar\b|\btv\b/) ? 8 :
    null != e.match(/\bparking\b|\bparken\b|\bparkimetro\b/) ? 9 :
    null != e.match(/\binsurance\b|\brenters\b|\bversicherung\b|\bseguro\b/) ? 10 :
    null != e.match(/\bnetflix\b|\butility\b|\bhulu\b|\bac\b/) ? 11 :
    null != e.match(/\bgroceries\b|\bmilk\b|\bgrocery\b|\bchicken\b|\bsafeway\b|\bbread\b|\beggs\b|\bstores?\b|\bmarket\b|\bpatel\b|\bbaza|\bcurd\b|\bveg\b|\bvegetables\b|\bkroger\b|\bbazz\b|\bbaaz|\bchips\b|\boil\b|\bshop\b|\bjuice\b|\btesco\b|\bfoods\b|\bapna\b|\bveggies\b|\bwhole\b|\bmart\b|\byogurt\b|\baldi\b|\bonions?\b|\bpastas?\b|\bshoprite\b|\bbasket\b|\bhoney\b|\bbananas?\b|\bhalal\b|\bsalt\b|\bbutter\b|\bjoes\b|\beggs?\b|\bapples?\b|\bmeijer\b|\bgarlic\b|\bmeyer\b|\bsupermarket\b|\bjoe's\b|\bpotatos?\b|\bicc\b|\bginger\b|\bolives?\b|\bcheese\b|\bstrawberry\b|\bcereal\b|\bwegmans\b|\bmutton\b|\bpopcorn\b|\bturkeys?\b|\bfarmers\b|\bwinco\b|\bbuttermilk\b|\bthanksgiving\b|\bfruits?\b|\bbeans\b|\bcola\b|\bwholefoods\b|\bwhole\bfoods\b|\bcream\b|\bcurd\b|\bdahi\b|\btomato\b|\bmaggi\b|\batta\b|\bgrofers\b|\bsabzi\b|\bcoconut\b|\blemon\b|\bvim\b|\bsurf\b|\bpoha\b|\bbigbasket\b|\bbig basket\b|\bdudh\b|\bsoda\b|\bghee\b|\bwatermelon\b|\btamatar\b|\bcold drink|\bnimbu pani\b|\btata fresh\b|\bstar bazar\b|\bstar bazaar\b|\bstar bazzar\b|\bsainsbury|\brewe\b|\blidl\b|\bnetto\b|\bedeka\b|\bkaufland\b|\bflotte\b|\balnatura\b|\bspar\b|\bspesa\b|\blebensmittel\b|\bmarktkauf\b|\bmirchi\b|\bcoles\b|\bcarrefour\b|\beinkauf\b|\beink\xe4ufe\b|\bb\xe4cker\b|\bbaecker\b|\bmilch\b|\beinkaufen\b|\bbr\xf6tchen\b|\bsupermarkt\b|\bbrot\b|\bwasser\b|\bkarotte\b|\bmarkt\b|\bk\xe4se\b|\bobst\b|\bfleisch\b|\boliven\xf6l\b|\bmetzger\b|\bgem\xfcse\b|\beier\b|\bzwiebeln\b|\bpilze\b|\berdbeeren\b|\bessig\b|\bcompras?\b|\bmercadona\b|\bmercado\b|\bsupermercado\b|\bfrutas?\b|\bpollos?\b|\bleche\b|\bmerca\b|\bcarnes?\b|\baceite\b|\bfruteria\b|\borange\b|\bquesos?\b|\bhuevos?\b|\bbolsas\b|\bverduras?\b|\barroz\b|\bfruter\xedas?\b|\bcarnicer\xedas?\b|\bhielos?\b|\bnespresso\b|\bfruitas?\b|\bbodegas?\b|\bhelados?\b|\bsnacks?\b|\btartas?\b|\bpapas?\b|\bconsum\b|\beroski\b|\balcampo\b|\bhipercor\b|\bgadis\b|\bcaprabo\b|\bveritas\b|\bbonarea\b|\bsainsburys\b|\bsupersol\b|\bzumos?\b|\bsupercor\b|\bcremas?\b|\bpescados?\b|\bwaitrose\b|\bpublix\b/) ? 12 :
    null != e.match(/\bdinner\b|\blunch\b|\bindian\b|\bbreakfast\b|\bsubway\b|\btea\b|\bgarden\b|\btaco\b|\bthai\b|\bstarbucks\b|\bchinese\b|\bchipotle\b|\bcurry\b|\bbombay\b|\bchat\b|\bbuffet\b|\bihop\b|\bsandwich\b|\bdiner\b|\btiffin\b|\bbfast\b|\btacos\b|\btavern\b|\bbagel\b|donalds\b|\bdunkin\b|\bbrunch\b|\bgelato\b|\bdonuts\b|\bwendys\b|\bkfc\b|\bpanera\b|\bdominoes\b|\bdomino|\bpapa\b|\bsushi\b|\bsabji\b|\bbiryani\b|\bdosa\b|\bcurries\b|\broti\b|\bshake\b|\bchai\b|\blassi\b|\blasi\b|\btiffin\b|\bmcd|\bsamosa\b|\bparatha\b|\bbiriyani\b|\bcanteen\b|\bmomo\b|\bcold coffee\b|\bchayoos\b|\bpani puri\b|\bvapiano\b|\bessen\b|\bfr\xfchst\xfcck\b|\bkaffe\b|\bkaffee\b|\babendessen\b|\bd\xf6ner\b|\bdoner\b|\bmittagessen\b|\bmittag\b|\bmensa\b|\bsalat\b|\bkuchen\b|\bpommes\b|\btee\b|\babend\b|\bnudeln\b|\bitaliener\b|\bcomidas?\b|\bcenas?\b|\bdesayunos?\b|\bpizzas?\b|\bcafes?\b|\bdinners?\b|\bburgers?\b|\bcoffees?\b|\bcaf\xe9s?\b|\balmuerzos?\b|\bbreakfast\b|\btapas\b|\brestaurantes?\b|\bmcdonalds?\b|\bburguers?\b|\brestaurants?\b|\bpaella\b|\bpatatas?\b|\bbbq\b|\bmcdonald's?\b|\bhamburguesas?\b|\brestos?\b|\bchurros?\b|\bkebabs?\b|\bcrepes?\b|\bdominos\b|\bbarbacoa\b|\bcenitas?\b|\blunches\b|\bpropinas?\b|\bmontaditos?\b|\bsopar\b|\bjantar\b|\btelepizzas?\b|\bfaborit\b|\budon\b|\balmo\xe7o\b|\bpinchos?\b|\bpintxos?\b|\bbocatas?\b|\bchupitos?\b|\bmerienda\b|\bchiringuito\b/) ? 13 :
    null != e.match(/\bwalmart\b|\bcostco\b|\btarget\b|\bpaper\b|\btoilet\b|\bdish\b|\bdollar\b|\bkitchen\b|\bcvs\b|\btide\b|\btowels\b|\bdetergent\b|\bwalgreens\b|\bliquid\b|\btp\b|\bsam's\b|\btoothpaste\b|\bbathroom\b|\bbath\b|\bvacuum\b|\bshampoo\b|\bhousehold\b|\bwal-mart\b|\bshower\b|\btissue\b|\bfilter\b|\bfoil\b|\bgloves\b|\bdmart\b|\bhandwash\b|\brossmann\b|\bklopapier\b|\btoilettenpapier\b|\bm\xfcllbeutel\b|\blimpiezas?\b|\bdetergentes?\b|\blavavajillas?\b|\bneteja\b|\bsuavizante\b/) ? 14 :
    null != e.match(/\bcar\b|\bauto\b|\bzipcar\b|\bzip\b|\benterprise\b|\bmaut\b|\bmietwagen\b|\bmaut\b|\bcoche\b|\bblabla\b/) ? 15 :
    null != e.match(/\bikea\b|\bmattress\b|\bbed\b|\btable\b|\bbj's\b|\bcouch\b|\bfridge\b|\bpillow\b|\bmuebles?\b/) ? 16 :
    null != e.match(/\brepair\b|\bmaintenance\b|\bhornbach\b|\bleroy\b|\bferreterias?\b|\bferreter\xedas?\b/) ? 17 :
    null != e.match(/\bpoker\b/) ? 20 :
    null != e.match(/\bmovies?\b|\bamc\b|\bcinema\b|\bkino\b|\bcine\b|\bpelis?\b|\bpeliculas?\b/) ? 21 :
    null != e.match(/\bmusic\b|\bconcert|\bspotify\b|\bdeezer\b/) ? 22 :
    null != e.match(/\bentry\b|\bhookah\b|\bcig|\bcasino\b|\bcamping\b|\bteatro\b|\bentradas?\b|\bmuseos?\b|\blibros?\b|\bbilletes?\b/) ? 23 :
    null != e.match(/\bgolf\b|\bgym\b|\bbowling\b|\bpiscina\b|\bdecathlon\b/) ? 24 :
    null != e.match(/\bsnacks?/) ? 26 :
    null != e.match(/\bwashing\b|\bbooks\b|\bkeys\b|\bprime\b/) ? 28 :
    null != e.match(/\bdogs?\b|\bcats?\b|\bpets?\b|\bca\xf1as?\b|\bpetco\b/) ? 29 :
    null != e.match(/\blaundry\b|\bcook\b|\bhaushaltsengel\b/) ? 30 :
    null != e.match(/\bbus\b|\bbuses\b|\bbusses\b|\btrains?\b|\brail\b|\bmegabus\b|\bgreyhound\b|\bbusse\b|\bbahn\b|\bzug\b|\bz\xfcge\b|\btren\b|\bmetro\b|\bsubway\b|\bautob\xfas\b/) ? 32 :
    null != e.match(/\bfuel\b|\bpetrol\b|\bchevron\b|\bgasoline\b|\bshell\b|\btanken\b|\btanke\b|\bbenzin\b|\bdiesel\b|\bgasolina\b|\bgasoli\b|\bgasolineras?\b|\bgasofa\b/) ? 33 :
    null != e.match(/\btravel\b|\brides?\b|\btoll\b|\bferry\b|\bpeatges?\b|\bmotos?\b|\bpeajes?\b|\bbarcos?\b|\bautopista\b/) ? 34 :
    null != e.match(/\bplane\b|\bjetblue\b|\bairline\b|\bairlines\b|\bflights?\b|\bflug\b|\bfl\xfcge\b|\bavion\b|\bvuelos?\b|\bryanair\b/) ? 35 :
    null != e.match(/\btaxis?\b|\bcabs?\b|\btaxicabs?\b|\bubers?\b|\blyfts?\b|\bolas?\b|\bflughafen\b|\btuk\b|\bcabify\b/) ? 36 :
    null != e.match(/\btrash\b|\bgarbage\b|\bm\xfcll\b|\bbasura\b/) ? 37 :
    null != e.match(/\bbeers?\b|\bdrinks?\b|\bparty\b|\bbar\b|\bwines?\b|\bliquor\b|\bbooze\b|\balcohol\b|\bshots\b|\bpub\b|\bwhiskey\b|\bbier\b|\bwein\b|\bgetr\xe4nke\b|\bwg\b|\balkohol\b|\btrinken\b|\bcerves?\b|\bvinos?\b|\bbebidas?\b|\bcervezas?\b|\bmojitos?\b|\bbirras?\b|\bgin\b|\bcopas?\b|\bbotellon\b/) ? 38 :
    null != e.match(/\blaptop\b|\bprinter\b|\bhdmi\b|\bfrys\b|\bkabel\b/) ? 39 :
    null != e.match(/\bclothing\b|\bshirt\b|\bclothes\b|\bshoes\b|\bmacys\b|\bkohls\b|\bgap\b|\bsocken\b|\bropas?\b|\bcamisetas?\b|\bprimark\b|\bgafas?\b|\bzara\b/) ? 41 :
    null != e.match(/\bcake\b|\bgift\b|\bbday\b|\bgeschenk\b|\bhochzeit\b|\bgeburtstag\b|\bgeschenke\b|\bregalos?\b/) ? 42 :
    null != e.match(/\bmedicines\b|\bmedicine\b|\bmedical\b|\bapotheke\b|\bfarmacia\b|\bpastillas?\b/) ? 43 :
    null != e.match(/\bfedex\b|\bmassage\b|\bhigienicos?/) ? 44 : null != e.match(/\bbikes?\b|\bbicycles?\b|\bbicis?\b/) ? 46 :
    null != e.match(/\bhotel|\bairbnb|\binns?\b|\bhostel\b|\bunterkunft\b|\b\xfcbernachtung\b|\bhostal\b|\balojamiento\b|\bhilton\b/) ? 47 :
    null != e.match(/\bcleaning\b|\bmaid\b|\bcleaner|\bbai\b|\bsafai\b|\bputzfrau\b|\bputzmann\b/) ? 48 :
    null != e.match(/\bgas\b/) ? null != e.match(/bill|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\bco\b|\bnatural\b/) ? 6 :
    (e.match(/\bto\b|\bfrom\b|\boff\b|\btrip\b|\bbefore\b|\bgallon\b|\bliter\b/),33) :
    null != e.match(/\bwater\b/) ? null != e.match(/\bbottle\b|\bcan|mineral|sparkling|seltzer/) ? 12 :
    (e.match(/bill|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/),7) :
    null != e.match(/\bconservice/) ? 11 :
    null != e.match(/\bheat\b|\bheating\b|\bcylinder\b|\bcooking gas\b/) ? 6:
    18;
}

async function deleteBotDMs(dmChannel){
    let channel = await TransactionBot.channels.fetch(dmChannel);
    let messages = await channel.messages.fetch({limit:100});
    let msgIds = [];
    for(const msg of messages){
        if(msg[1].author.id == TransactionBot.user.id){
        await user.dmChannel.messages.fetch(msg[0]).then(m=>m.delete());
        }
    }
} 