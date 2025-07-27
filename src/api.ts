import { Account } from "./types/account";
import { User } from "./types/user";
import { config } from "./config";

export const refreshToken = () => {};

export const exchangeCodeForToken = () => {};

export const getAccountTransactions = async (user: User, account: Account) => {
  const nowDate = (new Date()).toISOString();
  const url = `https://api.truelayer.com/data/v1/${account.type === "credit" ? "cards" : "accounts"}/${account.id}/transactions?from=${encodeURIComponent(account.last_transaction_date)}&to=${encodeURIComponent(nowDate)}`;
  const options = {
    method: 'GET',
    headers: {Accept: 'application/json',
            Authorization: `Bearer ${user.truelayer.access_tokens[account.truelayer_token_index]}`,
            'X-PSU-IP': config.jsonConfig.truelayer.app_client_ip
    }
  }; 
};

export const addSplitwiseTransaction = (user: User, cost: number, description: string, date: Date) => {
  const url = `https://secure.splitwise.com/api/v3.0/create_expense`;
  const options = {
    method: "POST",
    headers: {Accept: 'application/json',
    'Content-Type': 'application/json', Authorization: `Bearer ${user.splitwise_api_token}`,
    body: JSON.stringify({
      cost,
      description,
      date,
      repeat_interval: "never",
      currency_code: "GBP",
      category_id: guess_category(description),
      group_id: user.splitwise_group_id,
      split_equally: true
      })
    }
  }
};

const guess_category = (e: string | null): number => {
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
};
