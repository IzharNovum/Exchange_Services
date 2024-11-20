class ExchangePair {

    constructor(
        from,
        to,
        symbol,
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
        this.cliendOrderID = cliendOrderID;
        this.accountID = this.accountID;
        this.accntIDUUID = accntIDUUID;
        this.leverage = leverage;
        this.tgtCcy = tgtCcy;
        this.tdMode = tdMode;
        this.marginCoin = marginCoin;
        this.marginMode = marginMode;
    }

    static getTimeInForce() {
        return this.timeInForce;
    }

    static setTimeInForce(TIF){
        this.timeInForce = TIF
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

    static getMarginMode(){
        return this.marginMode;
    }

    static setMarginMode(marginMode){
        this.marginMode = marginMode;
    }

    static getMarginCoin(){
        return this.marginCoin;
    }

    static setMarginCoin(marginCoin){
        this.marginCoin = marginCoin;
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
