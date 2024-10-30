import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";



class kucoin_Service{


    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
    static STATE_MAP = {
      canceled: kucoin_Service.STATUS_CANCELLED,
      mmp_canceled: kucoin_Service.STATUS_CANCELLED,
      live: kucoin_Service.STATUS_ONGOING,
      partially_filled: kucoin_Service.STATUS_PARTIAL_FILLED,
      filled: kucoin_Service.STATUS_FILLED,
    };




static getBaseUrl(){
    return "https://api.kucoin.com";
}



static buidlQueryParams(params){
    return params;
}



    // AUTHENTICATION
 static async Authentication(endPoint = null, params = {}, method = "GET"){
    const now = new Date();
    const timestamp = now.getTime();
    const API_Key = process.env.KC_API_KEY;
    const Secret_key = process.env.KC_SECRET_KEY;
    const account = "Izhar@Novum";
    const passphrase = crypto.createHmac('sha256', Secret_key)
                     .update(account)
                     .digest('base64');
    const Version = "3";

    let queryString = "";
    let body = "";

    if(method === "GET"){
        queryString = Object.keys(params ?? {}).length === 0 ? "" : "?" + Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
    }else{
        body = JSON.stringify(params);
    }

    //GENERATING SIGNATURE...
    const EndPoint = `${endPoint}${queryString ?? ""}`;
    const presigned = `${timestamp}${method}${EndPoint}${body}`;
    const Signature = crypto.createHmac("sha256", Secret_key).update(presigned).digest("base64");

    return  {
        "KC-API-KEY":API_Key,
        "KC-API-SIGN":Signature,
        "KC-API-TIMESTAMP":timestamp,
        "KC-API-PASSPHRASE":passphrase,
        "KC-API-KEY-VERSION":Version,
        "Content-Type": "application/json",
    }
}


    // CALL-EXCHANGE-API
    static async  callExchangeAPI(endPoint, params, method = "GET"){
    try {
        const header = await this.Authentication(endPoint, params, method);
        console.log("Authentication",header);

        const baseUrl = this.getBaseUrl();
        const queryString = method === "GET" ? Object.keys(params ?? {}).length === 0 ? "" : "?" + Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&") : "";
        const url = `${baseUrl}${endPoint}${queryString}`;

        console.log("URL:", url);

        const options = {
            method,
            headers: header,
            ...(method === "GET" ? {} : {body: JSON.stringify(params)}),
        }

        const data = await fetch(url, options);
        const response = await data.json();


        return response;
    } catch (error) {
        console.error("Error CallExchangeAPI!", error);
        throw error;
    }
}

    // https://www.kucoin.com/docs/rest/account/basic-info/get-account-list-spot-margin-trade_hf
    static async fetchBalanceOnExchange(){
        const endPoint = "/api/v1/accounts";
        try {
            const response = await this.callExchangeAPI(endPoint, {});

            if(response.code !== 200000 || response.status !== 200){
            console.warn("Response Is Not OK!", response);
            }
            let result = { coins: [] };

            if (response?.data?.accountAssets && Array.isArray(response.data.accountAssets)) {
                response.data.accountAssets.forEach((coinInfo) => {
                  const availBal = parseFloat(coinInfo.available);
                  const frozenBal = parseFloat(coinInfo.holds);
    
                    result.coins.push({
                        id: coinInfo.id,
                      coin: coinInfo.currency,
                      type: coinInfo.type,
                      free: availBal,
                      used: frozenBal,
                      total: availBal + frozenBal,
                    });
                });

            }else{
                // If no coins were added, shows a default values
                if (result.coins.length === 0) {
                    result.coins.push({
                        id: "",
                        coin: 0,
                        type: "NONE",
                        free: 0,
                        used: 0,
                        total: 0,
                    });
                }
            }

            console.log("Response From API:", response);
            
            return result;
        } catch (error) {
        console.error("Error fetching balance:", error);
        throw error;
        }
    }

    // https://www.kucoin.com/docs/rest/spot-trading/orders/place-order
    static async placeOrderOnExchange(clientOid, side, symbol, price, size){
        const endPoint = "/api/v1/orders";
        try {
            const params = this.buidlQueryParams({
                clientOid : clientOid,
                side: side,
                symbol : symbol,
                price : price,
                size: size
            })
            const response = await this.callExchangeAPI(endPoint, params, "POST");

            console.log("Response from api", response);

            if(response.status !== 200){
                const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                return PlaceOrderResultFactory.createFalseResult(msg, response);
              }

            return await this.createSuccessPlaceOrderResult(response);
        } catch (error) {
            console.error("Error Placing An Order!", error.message);
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
          console.warn("Format Not Successed!", error.message);
          throw error;
        }
    }


    // https://www.kucoin.com/docs/rest/spot-trading/orders/get-order-list
    static async pendingOrders(){
        const endPoint = "/api/v1/limit/orders";
        try {

            const response = await this.callExchangeAPI(endPoint, {});

            console.log("response from api:", response);

            if(!response){
                console.warn("Response Is Not OK!", response);
              }

          return response;
        } catch (error) {
              console.error("Error Fetching Pending Orders!", error.message);
              throw  error;
        }
    }


    // https://www.kucoin.com/docs/rest/spot-trading/orders/cancel-order-by-orderid
    static async cancelOrderFromExchange(orderId){
        const endPoint = `/api/v1/orders/${orderId}`;
        try {

            const response = await this.callExchangeAPI(endPoint, {}, "DELETE");

            console.log("Response From API:", response);

            if(response.code !== 200000 || response.code !== 200){
                const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                return new CancelOrderResult(false, msg, response);
              }
            
            return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            console.error("Error Cancelling An Order!", error.message);
            throw error;
        }
    }


    // https://www.kucoin.com/docs/rest/spot-trading/orders/get-order-details-by-orderid
    static async fetchOrderFromExchange(orderId){
        const endPoint = `/api/v1/orders/${orderId}`;
        try {
            const response = await this.callExchangeAPI(endPoint, {});

            console.log("response from API", response);

            if (response.code !== 200000 || response.code !== 200) {
                const failureMsg =
                  response?.sMsg ?? response.msg ?? "Unexpected response format or missing critical fields.";
                return FetchOrderResultFactory.createFalseResult(failureMsg);
              }

        return this.createFetchOrderResultFromResponse(response);
        } catch (error) {
        console.error("Error Fetching Order Details!", error.message);
        throw error;
        }
    }


    static createFetchOrderResultFromResponse(response) {      
        const status = response.isActive ? UserOrder.STATUS_ONGOING : UserOrder.STATUS_COMPLETED;
        const avg = parseFloat(response.dealFunds) / parseFloat(response.dealSize) || 0;
        const filled = parseFloat(response.dealSize) || 0;
      
        return FetchOrderResultFactory.createSuccessResult(
          status,        //order status
          avg * filled, // Total cost
          avg,          // Average price
          0,            // No Fee Avail In res
          filled,       // Filled quantity
          new Date(response.time).toISOString() // Time
        );
      }

    // https://www.kucoin.com/docs/rest/spot-trading/fills/get-recent-filled-list
    static async loadTradesForClosedOrder(){
        const endPoint = "/api/v1/limit/fills";
        try {
            const response = await this.callExchangeAPI(endPoint, {});


            console.log("Response from API", response);
            
        return this.convertTradesToCcxtFormat(response ?? {});
        } catch (error) {
            console.error("Error Fetching Trades", error);
            throw error;
        }
    }

    static async convertTradesToCcxtFormat(trades = response) {

        try {
          let tradesArray = "";
    
          if (Array.isArray(trades)) {
              tradesArray = trades;
          } else if (trades && typeof trades === 'object') {
              tradesArray = [trades];
          }
      
          const ccxtTrades = tradesArray.map(trade => ({
            order: trade.orderId || "N/A",
            amount: trade.price || 0,
            baseQty: trade.size || 0,
            fee: {
              currency: trade.feeCurrency || "N/A",
              cost: Math.abs(trade.fee) || 0,
            },
            error: trade.error || null,
          }));
      
          return ccxtTrades;
        } catch (error) {
            console.warn("Error Fetching Order Details!", error.message);
            throw  error;
        }
    }



    // https://www.kucoin.com/docs/rest/spot-trading/market-data/get-klines
    static async fetchKlines(symbol, type){
        const endPoint = "/api/v1/market/candles";
        try {
            const params = this.buidlQueryParams({
                symbol : symbol,
                type: type

            })
            
            const response = await this.callExchangeAPI(endPoint, params);

         //LOGS AN ERROR...
         if (Array.isArray(response.data) && response.data.length === 0) {
             return; // Exit early if there is no data
           }

           let klines = response.data.map(kline => [
             kline[0], // time
             kline[1], // open
             kline[2], // high
             kline[3], // low
             kline[4], // close
             0 // no-volume
           ]);
        
           klines.sort((a, b) => a[0] - b[0]); //Sorted By timestamp

            // console.log("Response From API", klines);

        
           return klines;
        } catch (error) {
            console.error("Error Fetchig Klines", error);
            throw error;
        }
    }


}


export default kucoin_Service;