import BinanceService from "../Services/Binance_Service.js";
import CoinBase_Service from "../Services/CoinBase.js";
import huobiExchange from "../Services/Huobi_Service.js";

class ExchangePair{

    static timeInForce = ["GTC", "IOC", "FOK", "post_only"];

    constructor(
        
        from,
        to,
        symbol,
        cliendOrderID,
        accountID,
        accntIDUUID,
        leverage,
        tgtCcy,
        tdMode
    ){
        this.from = from,
        this.to = to,
        this.symbol = symbol,
        this.cliendOrderID = cliendOrderID;
        this.accountID = accountID;
        this.accntIDUUID = accntIDUUID;
        this.leverage = leverage;
        this.tgtCcy = tgtCcy;
        this.tdMode = tdMode
    }

    static getTimeinForce(){
        return this.timeInForce[0];
    }

    static getcliendOrderID(){
        // return this.cliendOrderID;
        return "384734bgbc78374374";
    }
    static getAccID(){
        // return this.accountID;
        return 233948934
    }

    static getAccntIDUUID(){
        return this.accntIDUUID;
    }

    static getLeverage(){
        return this.leverage;
    }

    static getTdMode(){
        return this.tdMode;
    }

    static gettgtCcy(){
        return this.tgtCcy;
    }


    static setPair(from, to) {
        this.from = from;
        this.to = to;
    }

    static From() {
        return this.from;
    }

    static To() {
        return this.to; 
    }

    static setSymbol(symbol) {
        this.symbol = symbol;
    }

    static getSymbol() {
        if (!this.symbol) {
            this.symbol = `${this.From()}/${this.To()}`;
            console.log("default symbol");
        }
        return this.symbol;
    }

}

export default ExchangePair;


// console.log("checking:",  ExchangePair.getSymbol())