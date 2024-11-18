import BinanceService from "../Services/Binance_Service.js";
import CoinBase_Service from "../Services/CoinBase.js";
import huobiExchange from "../Services/Huobi_Service.js";

class ExchangePair {
    static timeInForce = ["GTC", "IOC", "FOK", "post_only"];

    constructor(
        from,
        to,
        symbol,
        cliendOrderID,
        accntIDUUID,
        leverage,
        tgtCcy,
        tdMode
    ) {
        this.from = from;
        this.to = to;
        this.symbol = symbol;
        this.cliendOrderID = cliendOrderID;
        this.accountID = this.accountID;
        this.accntIDUUID = accntIDUUID;
        this.leverage = leverage;
        this.tgtCcy = tgtCcy;
        this.tdMode = tdMode;
    }

    static getTimeInForce() {
        return this.timeInForce[0];
    }

    static getcliendOrderID() {
        return this.cliendOrderID;
    }

    static setCliendOrderID(id) {
        this.cliendOrderID = id;
    }

    static getAccID() {
        return this.accountID;
    }

    static setAccID(accountID) {
        this.accountID = accountID;
    }

    static setPair(from, to) {
        this.from = from;
        this.to = to;
    }


    static From() {
        return this.from;
    }

    static  To() {
        return this.to;
    }

    static setSymbol(symbol) {
        this.symbol = symbol;
    }

    static getSymbol() {
        if (!this.symbol) {
            this.symbol = `${this.From()}/${this.To()}`;
            console.warn("default symbol");
        }
        return this.symbol;
    }
}



export default ExchangePair;
