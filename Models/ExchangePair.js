
class ExchangePair{

    static timeInForce = ["GTC", "IOC", "FOK", "post_only"];

    constructor(
        cliendOrderID,
        accountID,
        accntIDUUID,
        leverage,
        tgtCcy,
        tdMode
    ){
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
        return this.cliendOrderID;
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
}

export default ExchangePair;
