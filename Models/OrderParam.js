import UserBots from "../Database/models/Userbots.js";
import UserExchange from "../Database/models/UserExchange.js";
import ExchangePairModel from "../Database/models/Exchange_Pair.js";

class OrderParam {

    static SIDE_BUY = "BUY";
    static SIDE_SELL = "SELL";
    static TYPE_MARKET = "MARKET";
    static TYPE_LIMIT = "LIMIT";
    static TYPES = [OrderParam.TYPE_LIMIT, OrderParam.TYPE_MARKET];
    static SIDE_EFFECT_NONE = "NO_SIDE_EFFECT";



    constructor({
        side,
        quantity,
        idr,
        price,
        orderType = OrderParam.TYPE_LIMIT,
        sideEffect = OrderParam.SIDE_EFFECT_NONE,
        options = {}
    } = {}) {
        this.side = side;
        this.quantity = quantity;
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

    static async getIDR(){
        await OrderParam.fetchidr();
    
        if (this.idrIndex === undefined) {
            this.idrIndex = 0;
        }
    
        if (this.idrIndex < this.idr.length) {
            const IDR = this.idr[this.idrIndex];
            this.idrIndex++;
            return IDR;
        } else {
            console.warn("Index out of bounds for timeInForce.");
            return null;
        }

    }

    static async fetchidr() {
        const id = await UserExchange.findAll({
            attributes: ['Idr'],
            raw: true
        });
        const allidr = id.map(row => row.Idr);
        this.idr = allidr;

        return this.idr;
    }

    static async getQty() {
        await OrderParam.fetchQty();
    
        if (this.qtyIndex === undefined) {
            this.qtyIndex = 0;
        }
    
        if (this.qtyIndex < this.quantity.length) {
            const QTY = this.quantity[this.qtyIndex];
            this.qtyIndex++;
            return QTY;
        } else {
            console.warn("Index out of bounds for timeInForce.");
            return null;
        }
    }

    static async fetchQty() {
        const quantity = await ExchangePairModel.findAll({
            attributes: ['min_quantity'],
            raw: true
        });
        const qty = quantity.map(row => row.min_quantity);
        this.quantity = qty;

        return this.quantity;
    }

     static async getPrice() {
        await OrderParam.fetchPrice();
    
        if (this.priceIndex === undefined) {
            this.priceIndex = 0;
        }
    
        if (this.priceIndex < this.price.length) {
            const Price = this.price[this.priceIndex];
            this.priceIndex++;
            return Price;
        } else {
            console.warn("Index out of bounds for timeInForce.");
            return null;
        }
    };

    static async fetchPrice() {
        const price = await UserBots.findAll({
            attributes: ['initial_fund'],
            raw: true
        });
        const allPrice = price.map(row => row.initial_fund);
        this.price = allPrice;
        return this.price;
    }

    static async getType() {
        await OrderParam.fetchType();
    
        if (this.typeIndex === undefined) {
            this.typeIndex = 0;
        }
    
        if (this.typeIndex < this.orderType.length) {
            const Type = this.orderType[this.typeIndex];
            this.typeIndex++;
            return Type;
        } else {
            console.warn("Index out of bounds for timeInForce.");
            return null;
        }
    }

    static async fetchType() {
        const order = await UserBots.findAll({
            attributes: ['order_type'],
            raw: true
        });

        const alltype = order.map(row => row.order_type);
        this.orderType = alltype;
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