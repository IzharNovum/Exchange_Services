class OrderParam {

    static SIDE_BUY = "BUY";
    static SIDE_SELL = "SELL";
    static TYPE_MARKET = "MARKET";
    static TYPE_LIMIT = "LIMIT";
    static TYPES = [OrderParam.TYPE_LIMIT, OrderParam.TYPE_MARKET];
    static SIDE_EFFECT_NONE = "NO_SIDE_EFFECT";



    constructor(
        side,
        idr,
        quantity,
        price,
        orderType = OrderParam.TYPE_LIMIT,
        sideEffect = OrderParam.SIDE_EFFECT_NONE,
        options = {}
    ) {
        this.side = side;
        this.qty = quantity;
        this.idr = idr;
        this.price = price;
        this.orderType = orderType;
        this.sideEffect = sideEffect;
        this.options = options;
        this.chOptions = {}; // Will not be sent as params for ccxt place order
        this.exchangePair = null;
    }

    static createEmpty() {
        return new OrderParam('', 0, 0, OrderParam.TYPE_LIMIT);
    }

    static isEmpty() {
        return !this.side;
    }

    static getSide() {
        return this.side = OrderParam.SIDE_BUY;
    }

    static getIDR(){
        return this.idr;
    }

    static getQty() {
        return this.qty;
    }

    static setQty(quantity){
        this.qty = quantity;
    }

     static getPrice() {
        return this.price;
    };

    static setPrice(price){
        this.price = price;
    }

    static getType() {
        return this.orderType;
    }

    static seType(){
        return this.SIDE_BUY +  "-" + this.TYPE_MARKET;
    }
    static setType(orderType) {
        return this.orderType = orderType;
    }

    getSideEffect() {
        return this.sideEffect;
    }

    isMarket() {
        return this.orderType === OrderParam.TYPE_MARKET;
    }

    isLimit() {
        return this.orderType === OrderParam.TYPE_LIMIT;
    }

    static isBuy() {
        return this.side === OrderParam.SIDE_BUY;
    }

    static isSell() {
        return this.side === OrderParam.SIDE_SELL;
    }

    cloneWithAdjustQty(adjustQty) {
        const newObj = new OrderParam(this.side, adjustQty, this.price, this.orderType, this.sideEffect, this.options);
        newObj.setExchangePair(this.exchangePair);
        newObj.addChOptions(this.chOptions);
        return newObj;
    }

    cloneWithFormattedPrice(formattedPrice) {
        const newObj = new OrderParam(this.side, this.qty, formattedPrice, this.orderType, this.sideEffect);
        newObj.setExchangePair(this.exchangePair);
        newObj.addChOptions(this.chOptions);
        return newObj;
    }

    cloneToLimitOrder() {
        const newObj = new OrderParam(this.side, this.qty, this.price, OrderParam.TYPE_LIMIT, this.sideEffect);
        newObj.setExchangePair(this.exchangePair);
        newObj.addChOptions(this.chOptions);
        return newObj;
    }

    getOptions() {
        return this.options;
    }

    getOption(name, defaultValue) {
        return this.options[name] !== undefined ? this.options[name] : defaultValue;
    }

    getChOptions() {
        return this.chOptions;
    }

    addChOptions(opts) {
        this.chOptions = { ...this.chOptions, ...opts };
    }

    setOptions(opts) {
        this.options = opts;
    }

    getChOption(name, defaultValue) {
        return this.chOptions[name] !== undefined ? this.chOptions[name] : defaultValue;
    }

    toArray() {
        return {
            side: this.side,
            qty: this.qty,
            price: this.price,
            orderType: this.orderType,
            sideEffect: this.sideEffect,
            options: this.options,
            chOptions: this.chOptions,
            exchangePair: this.exchangePair ? this.exchangePair.name : null,
        };
    }

    setExchangePair(exchangePair) {
        this.exchangePair = exchangePair;
    }

    getExchangePair() {
        return this.exchangePair;
    }

    printLog(msg) {
        console.log(`${msg} OrderParam: ${JSON.stringify(this.toArray())}`);
    }
}


export default OrderParam;
