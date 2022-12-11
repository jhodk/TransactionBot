TransactionBot
==============

Discord bot that uses [TrueLayer](https://docs.truelayer.com/docs) and [Splitwise API](https://dev.splitwise.com/) to make your life easier!

-   React with 🤑 to add the transaction to your Splitwise group.
-   React with ♻ to remove a bot message from the DM channel.
-   React with 🔥 to remove the bot's ✅ reaction from a message.

[![transactionexamplebot](https://user-images.githubusercontent.com/7433327/186477103-835db792-ac1a-46ba-ab95-32c5bacdabdc.png)](https://user-images.githubusercontent.com/7433327/186477103-835db792-ac1a-46ba-ab95-32c5bacdabdc.png)

[![splitwisepic](https://user-images.githubusercontent.com/7433327/186477118-7b4c7b2f-9b2a-42a0-832a-d05d5bb2fd58.png)](https://user-images.githubusercontent.com/7433327/186477118-7b4c7b2f-9b2a-42a0-832a-d05d5bb2fd58.png)

[](https://github.com/jhodk/TransactionBot#setup)Setup
------------------------------------------------------

-   Create a discord bot account with [Discord Developer](https://discord.com/developers/docs/intro)
-   Invite the bot to a server you are a member of otherwise it won't be able to message you
-   Fill out the config.json file. You will need to perform a few manual requests to API endpoints here. [Postman](https://www.postman.com/downloads/) is recommended, and TrueLayer provides a helpful Postman environment collection which you can download.
    -   Important: make sure you have switched your TrueLayer account to LIVE (not Sandbox).
    -   Generate an authorisation link in the TrueLayer account page. Next click your auth link and follow the steps for your chosen bank account. You will end up with an access code which you will need to POST to the Exchange code for access token endpoint. This gives you the access_token and refresh_token.
    -   The access code is valid for 90 days, although this may increase to 1 year due to regulatory changes. When it expires the bot should send an error message and you will need to go through the above steps to generate a new access code.
    -   The access_token is only valid for 1 hour, however the refresh_token remains valid throughout the access code validity period (unless you don't use it for a while!)
    -   You can find your desired splitwise group_id using the <https://secure.splitwise.com/api/v3.0/get_groups> endpoint in Postman. Don't forget to add your API token in Authorisation > Bearer Token!
    -   Finally, lastTransactionDate should be the date from which you want to fetch transactions. Note also in my case my bank only gave 0am timestamps, i.e. no information on hours, minutes, seconds of any transactions. This lastTransactionDate will be updated in the config file at runtime.
    -   ClientIP should be the IP address of the end user. The TrueLayer documentation says this avoids a rate limit of 4 calls per day.

[](https://github.com/jhodk/TransactionBot#limitations)Limitations
------------------------------------------------------------------

-   TrueLayer caches responses for 1 hour
-   Pending transaction ids and descriptions can differ to the confirmed transaction details. I decided to look at confirmed transactions only, since this means we only need to store the last known transaction id. However this does make the experience less responsive as transactions may take a day to be confirmed by the bank. Transaction ids of person-to-person transactions may also change after confirmation?
