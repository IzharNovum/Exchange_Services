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
import UserExchange from "../Database/models/UserExchange.js";
import PairModel from "../Database/models/Pair.js";


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
       try{
         const rows = await UserExchange.findAll({
            attributes: ['Timeinforce'],
            raw: true
        });

        const allTime = rows.map(row => row.Timeinforce);
        this.timeInForce = allTime;

        if (this.timeIndex === undefined) {
            this.timeIndex = 0;
        }

        if(this.timeIndex < this.timeInForce.length){
            const time = this.timeInForce[this.timeIndex];
            this.timeIndex++;
            return time;
        }
    
        return this.timeInForce;
    } catch(error) {
        console.error("Index out of bounds for timeInForce.");
        return null;
    }
}

    static async getcliendOrderID() {
        try{
            const cliend = await UserExchange.findAll({
                attributes: ['Clientorderid'],
                raw: true
            });
            const allclient = cliend.map(row => row.Clientorderid);
            this.cliendOrderID = allclient;
        
   
           if (this.cliendIndex === undefined) {
                this.cliendIndex = 0;
            }

           if (this.cliendIndex < this.cliendOrderID.length) {
            const cliendId = this.cliendOrderID[this.cliendIndex];
            this.cliendIndex++;
            return cliendId;
            }
       
           return this.cliendOrderID;
       } catch(error) {
           console.error("Index out of bounds for timeInForce.");
           return null;
       }
    }


    static async tdMode() {
        try{
            const tdMod = await UserExchange.findAll({
                attributes: ['TdMode'],
                raw: true
            });
            const alltd = tdMod.map(row => row.TdMode);
            this.tdmode = alltd;
        
   
           if (this.tdIndex === undefined) {
                this.tdIndex = 0;
            }

           if (this.tdIndex < this.tdmode.length) {
            const tdMode = this.tdmode[this.tdIndex];
            this.tdIndex++;
            return tdMode;
            }
       
           return this.tdmode;
       } catch(error) {
           console.error("Index out of bounds for timeInForce.");
           return null;
       }
    }

    static async getAccID() {
        try{
            const account = await UserExchange.findAll({
                attributes: ['account'],
                raw: true
            });
            const acc = account.map(row => row.account);
            this.accountID = acc;
        
            if (this.AccidIndex === undefined) {
                this.AccidIndex = 0;
            }
        
            if (this.AccidIndex < this.accountID.length) {
                const account = this.accountID[this.AccidIndex];
                this.AccidIndex++;
                return account;
            } 
            
            return this.accountID;
       } catch(error) {
           console.error("Index out of bounds for timeInForce.");
           return null;
       }
    }
    static async fetchACC() {

    }


    static async getAccUUID() {
        try{
            const accUID = await UserExchange.findAll({
                attributes: ['Accntuuid'],
                raw: true
            });
            const allUID = accUID.map(row => row.Accntuuid);
            this.accntIDUUID = allUID;
        
            if (this.AccUID === undefined) {
                this.AccUID = 0;
            }
        
            if (this.AccUID < this.accntIDUUID.length) {
                const AccUI = this.accntIDUUID[this.AccUID];
                this.AccUID++;
                return AccUI;
            }
            
            return this.accntIDUUID;
       } catch(error) {
           console.error("Index out of bounds for timeInForce.");
           return null;
       }
    }


    static async getMarginMode(){
        try{
            const mode = await UserExchange.findAll({
                attributes: ['Marginmode'],
                raw: true
            });
            const allMode = mode.map(row => row.Marginmode);
            this.marginMode = allMode;
        
            if (this.Mmode === undefined) {
                this.Mmode = 0;
            }
        
            if (this.Mmode < this.marginMode.length) {
                const Mode = this.marginMode[this.Mmode];
                this.Mmode++;
                return Mode;
            }
            
            return this.marginMode;
       } catch(error) {
           console.error("Index out of bounds for timeInForce.");
           return null;
       }
    }

    static async getMarginCoin(){
        try{
            const margin = await UserExchange.findAll({
                attributes: ['Margincoin'],
                raw: true
            });
            const allCoin = margin.map(row => row.Margincoin);
            this.marginCoin = allCoin;
     
            if (this.marginIndex === undefined) {
                this.marginIndex = 0;
            }
        
            if (this.marginIndex < this.marginCoin.length) {
                const Coin = this.marginCoin[this.marginIndex];
                this.marginIndex++;
                return Coin;
            } 
            
            return this.marginCoin;
       } catch(error) {
           console.error("Index out of bounds for timeInForce.");
           return null;
       }
    }

    static async getLeverage(){
        try{
            const levl = await UserExchange.findAll({
                attributes: ['Leverage'],
                raw: true
            });
            const lev = levl.map(row => row.Leverage);
            this.leverage = lev;        
   
            if (this.levIndex === undefined) {
                this.levIndex = 0;
            }
        
            if (this.levIndex < this.leverage.length) {
                const leverge = this.leverage[this.levIndex];
                this.levIndex++;
                return leverge;
            }
       
           return this.leverage;
       } catch(error) {
           console.error("Index out of bounds for timeInForce.");
           return null;
       }
    }



    static setPair(from, to) {
        this.from = from;
        this.to = to;
    }

    static async From() {
        const rows = await PairModel.findAll({
            attributes: ['from'],
            raw: true
        });
    
        const allValues = rows.map(row => row.from);
        this.from = allValues;
    
        return this.from;
    }
    
    static async getNextfrom(){
        if (this.index === undefined) {
            this.index = 0;
        }
        await ExchangePair.From(); 

        if (this.index < this.from.length) {
            console.log("from:", this.index)
            const base_currency = this.from[this.index];
            return base_currency;
        } else {
            console.warn('Index is out of bounds for the to array.');
        }
    }

    static async To() {
        const rows = await PairModel.findAll({
            attributes: ['to'],
            raw: true
        });
    
        const allValues = rows.map(row => row.to);
        this.to = allValues;
        return this.to;
    };

    static async getNextto(){
        if (this.index === undefined) {
            this.index = 0;
        }
        await ExchangePair.To(); 

        if (this.index < this.to.length) {
            console.log("to:", this.index)
            const quote_currency = this.to[this.index];
            return quote_currency;
        } else {
            console.warn('Index is out of bounds for the to array.');
            return null;
        }
    }

        static incrementIndex() {
        if (this.index < this.from.length && this.to.length) {
            this.index++;
        } else {
            console.warn('Index is out of bounds for either the from or to array.');
        }
    }
    

    static setSymbol(exchange) {
        this.exchange = exchange;
    }


 static async getSymbol() {
    let from = await ExchangePair.getNextfrom();
    let to = await ExchangePair.getNextto();
    this.incrementIndex();
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

