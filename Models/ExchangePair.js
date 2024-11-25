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
import commonParam from "../ExchangeIntegration/CommonParams.js";

class ExchangePair {

    constructor(
        from,
        to,
        symbol,
        idr,
        exchange,
        cliendOrderID,
        accntIDUUID,
        leverage,
        tgtCcy,
        tdMode,
        marginCoin,
        marginMode
    ) {
        this.from = from;
        this.to = to;
        this.symbol = symbol;
        this.idr = idr;
        this.exchange = exchange;
        this.cliendOrderID = cliendOrderID;
        this.accountID = accountID;
        this.accntIDUUID = accntIDUUID;
        this.leverage = leverage;
        this.tgtCcy = tgtCcy;
        this.tdMode = tdMode;
        this.marginCoin = marginCoin;
        this.marginMode = marginMode;
    }

    static async getTimeInForce() {
        this.timeInForce = await commonParam.timeinforce();
        return this.timeInForce;
    }


    static async getcliendOrderID() {
        this.cliendOrderID = await commonParam.cliendID();
        return this.cliendOrderID;
    }


    static async tdmode() {
        this.tdMode = await commonParam.Tdmode();
        return this.tdMode;
    }


    static async getAccID() {
        this.accountID = await commonParam.accountid();
        return this.accountID;
    }


    static async getAccUUID() {
        this.accntIDUUID = await commonParam.accUUID();
        return this.accntIDUUID;
    }

    static async getMarginMode(){
         this.marginMode = await commonParam.marginMode();
         return this.marginMode;
    }

    static async getMarginCoin(){
        this.marginCoin = await commonParam.marginCoin();
        return this.marginCoin;
    }


    static async getLeverage(){
        this.leverage  = await commonParam.Leverage();
        return this.leverage;
    }


    static setPair(from, to) {
        this.from = from;
        this.to = to;
    }


    static async From() {
        return this.from;
    }

    static async To() {
        return this.to;
    }

    static setSymbol(exchange) {
        this.exchange = exchange;
    }


 static async getSymbol() {
    let from = await commonParam.From();
    let to = await commonParam.To();
    let symbol = "";

    switch (this.exchange) {
        case Huobi_Service:
        case Binance_Service:
        case Kraken_Service:
        case BitGetFuture_Service:
        case Kucoin_Future:
        case Mexc_Service:
            symbol = `${from}${to}`;
            break;
        case CoinBase_Service:
        case kucoin_Service:
        case OkexService:
            symbol = `${from}-${to}`;
            break;
        case Gate_Service:
        case Indodax_Services:
        case TokoCrypto:
            symbol = `${from}_${to}`;
            break;
        case BitFinex_Service:
            symbol = `t${from}${to}`;
            break;
        case BitGet_Service:
            symbol = `${from}${to}_SPBL`;
            break;
        case Crypto_Service:
            symbol = `${from}${to}-PERP`;
            break;
        default:
            console.log("No Exchange or Symbol Found!");
            break;
    }
    return symbol;
}
    
}



export default ExchangePair;