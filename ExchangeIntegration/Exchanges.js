import CoinBase_Service from "../Services/CoinBase.js";
import Binance_Service from "../Services/Binance_Service.js";
import Crypto_Service from "../Services/Crypto_Service.js";
import Huobi_Service from "../Services/Huobi_Service.js";
import BitFinex_Service from "../Services/BitFinex_Service.js";
import BitGetFuture_Service from "../Services/BitGetFuture_Service.js";
import BitGet_Service from "../Services/BitGet_Service.js";
import Gate_Service from "../Services/Gate_Service.js";
import Indodax_Services from "../Services/Indodax_Service.js";
import Kucoin_Future from "../Services/Kucoin_Future.js";
import kucoin_Service from "../Services/Kucoin_Service.js";
import Mexc_Service from "../Services/Mexc_Service.js";
import TokoCrypto from "../Services/TokoCrypto.js";
import OkexService from "../Services/Okex_Service.js";
import Kraken_Service from "../Services/Kraken_Service.js";
import OrderParam from "../Models/OrderParam.js";






class ExchangeIntegration{
    constructor(exchangeService, orderParams){
        this.exchangeService = exchangeService
        this.orderParams = orderParams
    }

    async fetchBalanceOnExchange(){
        const service = await this.exchangeService.fetchBalanceOnExchange();
        console.log("fetch balance:", service);
        return service
    }
    async placeOrderOnExchange(orderParams){
        const service = await this.exchangeService.placeOrderOnExchange(orderParams);
        console.log("Place AN Order:", service);
        return service
    }
    async pendingOrders(){
        const service = await this.exchangeService.pendingOrders();
        console.log("fetch Pending Order:", service);
        return service
    }

    async cancelOrderFromExchange(){
        const service = await this.exchangeService.cancelOrderFromExchange();
        console.log("Cancel an Order:", service);
        return service
    }
    async fetchOrderFromExchange(){
        const service = await this.exchangeService.fetchOrderFromExchange();
        console.log("fetch Order:", service);
        return service
    }
    async loadTradesForClosedOrder(){
        const service = await this.exchangeService.loadTradesForClosedOrder();
        console.log("fetch Trades:", service);
        return service
    }
    async fetchKlines(){
        const service = await this.exchangeService.fetchKlines();
        console.log("fetch Klines:", service);
        return service
    }

}

export default ExchangeIntegration;




const exchangeService = {
    0: Huobi_Service,
    1: Binance_Service,
    2: Kraken_Service,
    3: Crypto_Service,
    4: BitFinex_Service,
    5: BitGet_Service,
    6: BitGetFuture_Service,
    7: CoinBase_Service,
    8: Gate_Service,
    9: Indodax_Services,
    10: kucoin_Service,
    11: Kucoin_Future,
    12: Mexc_Service,
    13: TokoCrypto,
    14: OkexService
};

const bots = [
    {
        Asset: {
            Trading_Pair: "BTC/USDT",
            Strategy: "LONG",
        },
        Trade_Parameter: {
            Fund_Allocation: 100,
            Order_Type: "MARKET",
            Exit_Order_Type: "MARKET",
            Base_Order_Limit: 30.000,
            Base_Order_Type: "STATIC",
            Extra_Orders: 3,
            Minimum_price_gap_between_Extra_Orders: 1,
            Trading_Frequency: "5m",
        },
        Entry_Conditions: {
            Indicator_Triggers: "RSI"
        },
        Exit_Conditions: {
            Take_Profit_Type: 5,
            Stoploss_Type: 2,
            Indicator_Triggers: "RSI",
            Minimum_Profit_for_Indicator_Trigger: 1,
        },
        Exchange: 1
    },
    {
        Asset: {
            Trading_Pair: "BTC/USDT",
            Strategy: "LONG",
        },
        Trade_Parameter: {
            Fund_Allocation: 100,
            Order_Type: "MARKET",
            Exit_Order_Type: "MARKET",
            Base_Order_Limit: 30.000,
            Base_Order_Type: "STATIC",
            Extra_Orders: 3,
            Minimum_price_gap_between_Extra_Orders: 1,
            Trading_Frequency: "5m",
        },
        Entry_Conditions: {
            Indicator_Triggers: "RSI"
        },
        Exit_Conditions: {
            Take_Profit_Type: 5,
            Stoploss_Type: 2,
            Indicator_Triggers: "RSI",
            Minimum_Profit_for_Indicator_Trigger: 1,
        },
        Exchange: 13
    },
    {
        Asset: {
            Trading_Pair: "BTC/USDT",
            Strategy: "LONG",
        },
        Trade_Parameter: {
            Fund_Allocation: 100,
            Order_Type: "MARKET",
            Exit_Order_Type: "MARKET",
            Base_Order_Limit: 30.000,
            Base_Order_Type: "STATIC",
            Extra_Orders: 3,
            Minimum_price_gap_between_Extra_Orders: 1,
            Trading_Frequency: "5m",
        },
        Entry_Conditions: {
            Indicator_Triggers: "RSI"
        },
        Exit_Conditions: {
            Take_Profit_Type: 5,
            Stoploss_Type: 2,
            Indicator_Triggers: "RSI",
            Minimum_Profit_for_Indicator_Trigger: 1,
        },
        Exchange: 1 
    }
];




for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    const exchangeIndex = bot.Exchange;
    console.log("just checking", exchangeIndex);

    const selectedExchangeService = exchangeService[exchangeIndex]; 
    
    if (selectedExchangeService) {
        const exchangeIntegration = new ExchangeIntegration(selectedExchangeService, OrderParam);  
            await exchangeIntegration.placeOrderOnExchange(OrderParam);
    } else {
        console.log(`No exchange service found for Bot ${i + 1}`);
    }
}


