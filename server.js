import app from "./app.js";
import ExchangeIntegration from "./ExchangeIntegration/Exchanges.js";
import Binance_Service from "./Services/Binance_Service.js";
import CoinBase_Service from "./Services/CoinBase.js";
import huobiExchange from "./Services/Huobi_Service.js";
import Kucoin_Future from "./Services/Kucoin_Future.js";
import kucoin_Service from "./Services/Kucoin_Service.js";


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server Running On Port: ${PORT}`);
});




app.get("/testing", async (req, res) => {
    try {
        const exchangeIntegration = new ExchangeIntegration(kucoin_Service);
        const balance = await exchangeIntegration.fetchKlines();
        res.json(balance);
    } catch (error) {
        console.error("Error fetching balance:", error);
        res.status(500).json({ error: "Failed to fetch balance" }); 
    }
});



