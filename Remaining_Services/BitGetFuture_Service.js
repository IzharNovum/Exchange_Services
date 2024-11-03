import BitGet_Service  from "./BitGet_Service.js";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";

class BitGetFuture_Service extends BitGet_Service {


    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
    static STATE_MAP = {
      canceled: BitGetFuture_Service.STATUS_CANCELLED,
      mmp_canceled: BitGetFuture_Service.STATUS_CANCELLED,
      live: BitGetFuture_Service.STATUS_ONGOING,
      partially_filled: BitGetFuture_Service.STATUS_PARTIAL_FILLED,
      filled: BitGetFuture_Service.STATUS_FILLED,
    };
    

    static buildQueryParams(params){
        return BitGet_Service.buildQueryParams(params);
    }

    static async callExchangeAPI(endPoint, params, method = "GET") {
        return await BitGet_Service.callExchangeAPI(endPoint, params, method);
    }

    static endPoints = {
        Balance : "/api/v2/mix/account/accounts",
        Place_Order : "/api/v2/mix/order/place-order",
        Pending_Order : "/api/v2/mix/order/orders-pending",
        Cancel_Order : "/api/v2/mix/order/cancel-order",
        Fetch_Order : "/api/v2/mix/order/detail",
        Trades : "/api/v2/mix/order/fill-history",
        klines : "/api/v2/mix/market/candles"
    }


    static isError(response){
        return response.code > "00000";
    }


/**
* Fetches user balance from the exchange
* @async
* @returns {Promise<{coins: Array}>} - User Balance-data.
* @see https://www.bitget.com/api-doc/contract/account/Get-Account-List
*/


    static async fetchBalanceOnExchange() {
        try {
            const response = await this.callExchangeAPI(this.endPoints.Balance, {});
    
            if (this.isError(response)) {
                console.error("Error message from exchange:", response.msg || "Unknown error");
                throw new Error(response.msg || "Unknown error occured");
            }
    
            let result = { coins: [] };
    
            // Check if the response data is an array
            if (Array.isArray(response.data)) {
                console.log("Account Data Array:", response.data);
    
                response.data.forEach((coinInfo) => {
                    let availBal = coinInfo.available ? parseFloat(coinInfo.available) : 0;
                    let frozenBal = coinInfo.frozen ? parseFloat(coinInfo.frozen) : 0;
    
                    result.coins.push({
                        coin: coinInfo.coinName || "N/A", 
                        free: availBal,
                        used: frozenBal,
                        total: availBal + frozenBal,
                    });
                });
            }
    
            // If no coins were added, shows default values
            if (result.coins.length === 0) {
                result.coins.push({
                    coin: "N/A",
                    free: 0,
                    used: 0,
                    total: 0,
                });
            }
    
            return result;
        } catch (error) {
            console.error("Error fetching balance:", error);
            throw error;
        }
    }
    


    /**
     * Place an order from exchange
     * @async
     * @param {string} symbol symbol -  BTCUSDT
     * @param {string} productType productType - USDT-FUTURES
     * @param {string} marginCoin marginCoin - USDT
     * @param {string} marginMode marginMode - isolated
     * @param {number} size size - 1 , 2
     * @param {string} side side - buy
     * @param {string} orderType orderType - limit.
     * @returns {Promise<object>} -  Order details in PlaceOrderResultFactory format.
     * @see https://www.bitget.com/api-doc/contract/trade/Place-Order
     */

       static async placeOrderOnExchange(symbol, productType, marginCoin, marginMode, size, side, orderType){
        try {
            const params =  this.buildQueryParams({
                symbol: symbol,
                productType: productType,
                marginCoin: marginCoin,
                marginMode: marginMode,
                size: size,
                side: side,
                orderType: orderType,

            });

            const response = await this.callExchangeAPI(this.endPoints.Place_Order, params, "POST");

            if (this.isError(response)) {
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return PlaceOrderResultFactory.createFalseResult(errMsg, response);
            };


            console.log("Response is OK:", response);

            return await this.createSuccessPlaceOrderResult(response);
        } catch (error) {
            console.error("Error Placing An Order:", error);
            throw error;
        }
    }

    static async createSuccessPlaceOrderResult(response) {
        try {
            const orderId = response.orderId;
            const time = new Date(); 
            const placeOrderResult = PlaceOrderResultFactory.createSuccessResult(
                orderId,
                UserOrder.STATUS_ONGOING,
                time,
                response,
            );
              return placeOrderResult;
        } catch (error) {
          console.error("Format Not Successed!", error.message);
          throw error;
        }
    }


    /**
     * Fetches open or pending order from exchange.
     * @async
     * @param {string} productType productType - USDT-FUTURES
     * @returns {Promise<object>} - List of Open Orders.
     * @see https://www.bitget.com/api-doc/contract/trade/Get-Orders-Pending
     */


    static async pendingOrders(productType){
        try {
            const params = this.buildQueryParams({
                productType: productType
            })
            const response =  await this.callExchangeAPI(this.endPoints.Pending_Order, params);

            if (this.isError(response)) {
                console.error("Error message from exchange:", response.msg || "Unknown error");
                throw new Error(response.msg || "Unknown error occured");
            }

            return response;
        } catch (error) {
            console.error("Error Fetching Orders:", error);
            throw error;
        }
    }
    

    /**
     * Cancels an existing order from exchange.
     * @async
     * @param {string} symbol symbol -  BTCUSDT
     * @param {string} productType productType - USDT-FUTURES
     * @param {string} orderId Order ID.
     * @returns {Promise<object>} - Status of Order Cancellation
     * @see https://www.bitget.com/api-doc/contract/trade/Cancel-Order
     */


    static async cancelOrderFromExchange(symbol, productType, orderId){
        try {
            const params = this.buildQueryParams({
                symbol: symbol,
                productType: productType,
                orderId: orderId
            });
    
            const response = await this.callExchangeAPI(this.endPoints.Cancel_Order, params, "POST");

            console.log("Response", response);
    

            if (this.isError(response)) {
                const errMsg = response.msg ?? JSON.stringify(response);
                return new CancelOrderResult(false, errMsg, response);

            };

            return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            console.error("Error Cancelling Orders:", error);
            throw error;
        }
    }
    
    /**
     * Fetches Order Details from exchange
     * @async
     * @param {string} symbol symbol -  BTCUSDT
     * @param {string} productType productType - USDT-FUTURES
     * @param {string} orderId Order ID.
     * @returns {Promise<object>} - Order details
     * @see https://www.bitget.com/api-doc/contract/trade/Get-Order-Details
     */

    static async fetchOrderFromExchange(symbol, productType, orderId){    
        try {
            const params = this.buildQueryParams({
                symbol: symbol,
                productType: productType,
                orderId: orderId
            });

            const response = await this.callExchangeAPI(this.endPoints.Fetch_Order, params);

            if (this.isError(response)) {
                console.error("Error message from exchange:", response.msg || "Unknown error");
                throw new Error(response.msg || "Unknown error occured");
            }

            console.log("Response Is Not OK:", response);


            return this.createFetchOrderResultFromResponse(response);
        } catch (error) {
            console.error("Error fetching Order:", error);
            throw error;
        }
    }

    static createFetchOrderResultFromResponse(response) {
        if (!response.data || Object.keys(response.data).length === 0) {
            return FetchOrderResultFactory.createFalseResult("No order data available.");
        }
        
        const data = response.data;
        const status = data.state ?? this.STATE_MAP[data.status] ?? UserOrder.STATUS_ONGOING;
        const avg = parseFloat(data.priceAvg) || 0; // Average price
        const filled = parseFloat(data.baseVolume) || 0; // Filled quantity (base volume)
        const totalCost = parseFloat(data.quoteVolume) || avg * filled; // Total cost (quote volume)
        const time = new Date(parseInt(data.cTime)).toISOString(); // Timestamp
    
        let feeAmount = 0;
        if (data.feeDetail) {
            try {
                const feeDetail = JSON.parse(data.feeDetail);
                feeAmount = Math.abs(parseFloat(feeDetail?.BGB?.totalFee)) || 0;
            } catch (error) {
                console.error("Error parsing feeDetail:", error);
            }
        }
    
        return FetchOrderResultFactory.createSuccessResult(
            status,     // Order status
            totalCost,  // Total cost
            avg,        // Average price
            feeAmount,  // Fee
            filled,     // Filled quantity
            time        // Time
        );
    }
    
    

    /**
     * Fetches recent trades from exchange
     * @async
     * @param {string} productType productType - USDT-FUTURES.
     * @returns {Promise<object>} - List of recent trades.
     * @see https://www.bitget.com/api-doc/contract/trade/Get-Fill-History
     */
    
    static async loadTradesForClosedOrder(productType){
        try {
            const params = this.buildQueryParams({
                productType: productType
            });
            const response = await this.callExchangeAPI(this.endPoints.Trades, params);


            if (this.isError(response)) {
                console.error("Error message from exchange:", response.msg || "Unknown error");
                throw new Error(response.msg || "Unknown error occured");
            }

            console.log("Response ", response);


            return this.convertTradesToCcxtFormat(response ?? {});
        } catch (error) {
            console.error("Error fetching Trades:", error);
            throw error;
        }
    }

    static async convertTradesToCcxtFormat(trades = []) {
        try {
            let tradesArray = [];

            if (Array.isArray(trades.data)) {
                tradesArray = trades.data;
            } else if (trades && typeof trades === 'object') {
                tradesArray = [trades.data];
            }
            
            
            if (tradesArray.length === 0) {
                return [{   
                    order: "N/A", 
                    amount: 0,
                    baseQty: 0,
                    fee: { currency: "N/A", cost: 0 },
                    error: null
                }];
            } else {
                return tradesArray.map(trade => ({
                    order: trade.tradeId || "N/A", 
                    amount: parseFloat(trade.price) || 0,       
                    baseQty: parseFloat(trade.baseVolume) || 0,     
                    fee: {
                        currency: trade.feeDetail?.feeCoin || "N/A",  
                        cost: trade.feeDetail?.totalFee ? Math.abs(parseFloat(trade.feeDetail.totalFee)) : 0
                    },
                    error: trade.msg || null
                }));
            }
        } catch (error) {
            console.error("Error converting trades:", error);
            throw error;
        }
    }
    


    /**
     * Fetches candles market data from exchange
     * @async
     * @param {string} symbol symbol -  BTCUSDT
     * @param {string} productType productType - USDT-FUTURES
     * @param {string} granularity granularity - 1m, 2m
     * @returns {Promise<object>} - List of candle data.
     * @see https://www.bitget.com/api-doc/contract/market/Get-Candle-Data
     */

    static async fetchKlines(symbol, productType, granularity){
        try {
            const params = this.buildQueryParams({
                symbol: symbol,
                productType : productType,
                granularity: granularity
            });
            const response = await this.callExchangeAPI(this.endPoints.klines, params);


            if (!response) {
                console.error("Error message from exchange:", response.msg || "Unknown error");
                throw new Error(response.msg || "Unknown error occured");
            }

            let klines = response.data.map(kline => [
                kline[0], // time
                kline[1], // open
                kline[2], // high
                kline[3], // low
                kline[4], // close
                kline[5], // Trading volume in base currency
                kline[6], // Trading volume of quote currency
            ]);


              klines.sort((a, b) => a[0] - b[0]); //Sorted By timestamp

            return klines;
        } catch (error) {
            console.error("Error fetching klines:", error);
            throw error;
        }
    }
}

export default BitGetFuture_Service;