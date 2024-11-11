
class ExchangePair{

    static timeInForce = ["GTC", "IOC", "FOK", "post_only"];

    constructor(
        cliendID,
        cliendOrderID,
        accountID,
        accntIDUUID,
        leverage,
        tgtCcy,
        tdMode
    ){
        this.cliendID = cliendID;
        this.cliendOrderID = cliendOrderID;
        this.accountID = accountID;
        this.accntIDUUID = accntIDUUID;
        this.leverage = leverage;
        this.tgtCcy = tgtCcy;
        this.tdMode = tdMode
    }

    static getTimeinForce(){
        return this.timeInForce;
    }

    static getcldID(){
        return this.cliendID;
    }

    static getcliendOrderID(){
        return this.cliendOrderID;
    }
    static getAccID(){
        return this.accountID;
        // return "5bd6e9286d99522a52e458de"
    }

    static getAccntIDUUID(){
        return this.accntIDUUID;
        // return "5bd6e9286d99522a52e458de"
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
}

export default ExchangePair;