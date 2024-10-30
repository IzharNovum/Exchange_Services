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




    // https://www.bitget.com/api-doc/contract/account/Get-Account-List
    static async fetchBalanceOnExchange() {
        const endPoint = "/api/v2/mix/account/accounts";
        try {
            const response = await this.callExchangeAPI(endPoint, {});
    
            console.log("Response From API:", response);
    
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
    



       // https://www.bitget.com/api-doc/contract/trade/Place-Order
       static async placeOrderOnExchange(symbol, productType, marginCoin, marginMode, size, side, orderType){
        const endPoint = "/api/v2/mix/order/place-order";
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

            const response = await this.callExchangeAPI(endPoint, params, "POST");

            if (response.code > "00000") {
                // console.log("Response Is Not OK:", response);
                const errMsg = response.error ?? response.msg ?? JSON.stringify(response);
                return PlaceOrderResultFactory.createFalseResult(errMsg, response);
            } else {
                console.log("Response is OK:", response);
            }

            return await this.createSuccessPlaceOrderResult(response);
            // return response;
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

    // https://www.bitget.com/api-doc/contract/trade/Get-Orders-Pending
    static async pendingOrders(productType){
        const endPoint = "/api/v2/mix/order/orders-pending";
        try {

            const params = this.buildQueryParams({
                productType: productType
            })
            const response =  await this.callExchangeAPI(endPoint, params);

            if (response.code > "00000") {
                console.log("Response Is Not OK:", response);
            } else {
                console.log("Response is OK:", response);
            }

            return response;
        } catch (error) {
            console.error("Error Fetching Orders:", error);
            throw error;
        }
    }
    

    // https://www.bitget.com/api-doc/contract/trade/Cancel-Order
    static async cancelOrderFromExchange(symbol, productType, orderId){
        const endPoint = "/api/v2/mix/order/cancel-order";
        try {
            const params = this.buildQueryParams({
                symbol: symbol,
                productType: productType,
                orderId: orderId
            });
    
            const response = await this.callExchangeAPI(endPoint, params, "POST");

            console.log("Response", response);
    

            if (response.code > "00000") {
                const errMsg = response[3] ?? JSON.stringify(response);
                return new CancelOrderResult(false, errMsg, response);

            } else {
                console.log("Response is OK:", response);
                return new CancelOrderResult(true, "Success", response);
                // return response
            }
            // return response;
        } catch (error) {
            console.error("Error Cancelling Orders:", error);
            throw error;
        }
    }
    
    // https://www.bitget.com/api-doc/contract/trade/Get-Order-Details
    static async fetchOrderFromExchange(symbol, productType, orderId){    
        const endPoint = "/api/v2/mix/order/detail";
        try {
            const params = this.buildQueryParams({
                symbol: symbol,
                productType: productType,
                orderId: orderId
            });

            const response = await this.callExchangeAPI(endPoint, params);

            if (response.code > "00000") {
                console.log("Response Is Not OK:", response);
            }
            console.log("Response Is Not OK:", response);


            return this.createFetchOrderResultFromResponse(response);
            // return response;
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
    
    
    

    // Pending form here...!
    

    // https://www.bitget.com/api-doc/contract/trade/Get-Fill-History
    static async loadTradesForClosedOrder(productType){
        const endPoint = "/api/v2/mix/order/fill-history";

        try {
            const params = this.buildQueryParams({
                productType: productType
            });
            const response = await this.callExchangeAPI(endPoint, params);


            if (response.code > "00000") {
                console.log("Response Is Not OK:", response);
            }

            console.log("Response ", response);


            return this.convertTradesToCcxtFormat(response ?? {});
            return response;
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
    


    // https://www.bitget.com/api-doc/contract/market/Get-Candle-Data
    static async fetchKlines(symbol, productType, granularity){
        const endPoint = "/api/v2/mix/market/candles";
        try {
            const params = this.buildQueryParams({
                symbol: symbol,
                productType : productType,
                granularity: granularity
            });
            const response = await this.callExchangeAPI(endPoint, params);


            if (response.code > "00000") {
                console.log("Response Is Not OK:", response);
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