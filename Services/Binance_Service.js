import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";





class BinanceService{

  static getBaseUrl(){
    return "https://api.binance.com"; 
  }

  static buildQueryParams(params){
    return params;
  }


                       //HEADER....
          static async Headers(endPoint = null, params = {}, method = "GET") {
            const now = new Date();
            const timestamp = now.getTime();
            const baseUrl = this.getBaseUrl();
            const apikey = process.env.BINANCE_API_KEY;
            const secret = process.env.BINANCE_SECRET_KEY;

// console.log("keys", apikey)
// console.log("keys", secret)

            let queryString = "";
            let path = endPoint;


            if(endPoint !== "/api/v3/klines"){    //ONLY ADDS THE TIMESTAMP AND SIGNATURE WHEN ITS NOT KLINES...
                    params.timestamp = timestamp;
                    queryString = Object.keys(params)
                        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                        .join("&");
                    const signed = queryString;
                    const raw_signature = crypto.createHmac("sha256", secret).update(signed).digest("hex");
                    queryString += `&signature=${raw_signature}`;
                    path = `${endPoint}?${queryString}`;

            }else{        //REMOVES THE TIMESTAMP AND SIGNATURE FOR KLINES...
                    queryString = Object.keys(params)
                    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
                    .join("&");
                    path = `${endPoint}?${queryString}`;
            }

            const fullUrl = `${baseUrl}${path}`;
            return {
                url: fullUrl,
                headers: {
                    "X-MBX-APIKEY": apikey,
                    "accept": "application/json",
                    "Content-Type": method === "POST" ? "application/x-www-form-urlencoded" : undefined,
                }
            };
        }

                     //CALL_EXCHANGE_API....
          static async callExchangeAPI(endPoint, params, method = "GET") {
            try {
                const { url, headers } = await this.Headers(endPoint, params, method);
                const options = {
                    method,
                    headers,
                };
                
                console.log("url:", url);
                console.log("options:", options);

                const fetchData = await fetch(url, options);
                const response = await fetchData.json();

                return response;
            } catch (error) {
                console.warn("API Call Failed!", error.message);
                throw error;
            }
        }



  // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#account-information-user_data
        static async fetchBalanceOnExchange(){
          try {

            const response = await this.callExchangeAPI("/api/v3/account", {});

          let result = { coins: [] };

          if (response?.balances && Array.isArray(response.balances)) {
              let hasValidCoin = false; // Flag to track if any valid coin was added

              response.balances.forEach((coinInfo) => {
                  let availBal = 0;
                  let frozenBal = 0;

                  availBal = coinInfo.free ? parseFloat(coinInfo.free) : 0;
                  frozenBal = coinInfo.locked ? parseFloat(coinInfo.locked) : 0;


                  if (availBal > 0 || frozenBal > 0) {
                      result.coins.push({
                          coin: coinInfo.asset,
                          free: availBal,
                          used: frozenBal,
                          total: availBal + frozenBal,
                      });
                      hasValidCoin = true; //flag if there's any valid coins for trading!
                  }
              });

      // If There is no coins or balance available then this is a default...
          if (!hasValidCoin) {
              result.coins.push({
                  coin: 0,
                  free: 0,
                  used: 0,
                  total: 0,
              });
          }
      }

      return result;
          } catch (error) {
            console.warn("Error Fetching Klines!", error)
          }
        }


  // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#new-order-trade
  static async placeOrderOnExchange(){
    try {
      const params = this.buildQueryParams({
              symbol: "BTCUSDT",
              side: "BUY",
              type: "LIMIT",
              price: 30000,
              quantity: 1,
              timeInForce: "GTC", //Good Till Cancel
      });

      const response = await this.callExchangeAPI("/api/v3/order", params, "POST");

      if(response.status !== 200){
        const msg =
        response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
      return PlaceOrderResultFactory.createFalseResult(msg, response);
      }

      return this.createSuccessPlaceOrderResult(response);
    } catch (error) {
      console.warn("Error Placing An Order!", error);
    }
  }

  static createSuccessPlaceOrderResult(response) {
    try {
        const STATUS_ONGOING = "ongoing";
        const orderId = response?.data;
        const time = new Date();
        const placeOrderResult = PlaceOrderResultFactory.createSuccessResult(
            orderId,
            STATUS_ONGOING,
            time,
            response,
        );
          return placeOrderResult;
    } catch (error) {
          error("Not Successed!", error.message);
    }
}


  // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#current-open-orders-user_data
  static async pendingOrders(){
    try {
      const response = await this.callExchangeAPI("/api/v3/openOrders", {});

      if(response.status !== 200){
        console.warn("Response Is Not OK!", response);
      }

      return response
    } catch (error) {
      console.warn("Error Placing An Order!", error);
    }
  }


  // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#cancel-order-trade
    static async cancelOrderOnExchange(orderId) {
      try {
        const params = this.buildQueryParams({
          symbol: "BTCUSDT",
          orderId: orderId,
        })

         const response = await this.callExchangeAPI("/api/v3/order", params, "DELETE");

         if(response.status !== 200){
          const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
          return new CancelOrderResult(false, msg, response);
        }

        return response;
      } catch (error) {
      console.warn("Error Cancelling An Order!", error)
      throw new error;
      }
    }

    // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#all-orders-user_data
    static async fetchOrderFromExchange(orderId){
      try {
        const params =  this.buildQueryParams({
          symbol: "BTCUSDT",
          orderId: orderId,
        });

        const response = await this.callExchangeAPI("/api/v3/order", params);

        if(response.status !== 200){
          const failureMsg =
          response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
        return FetchOrderResultFactory.createFalseResult(failureMsg);
        }

        return this.createFetchOrderResultFromResponse(response);
      } catch (error) {
      console.warn("Error Fetching Order Details!", error)
        throw error;
      }
    }

    static createFetchOrderResultFromResponse(response) {      
      const status =
        this.STATE_MAP[response.data?.[0]?.state] ?? UserOrder.STATUS_ONGOING;
      const avg = response.data?.[0].avgPx || 0;
      const filled = response.data?.[0].accFillSz || 0;
    
      return FetchOrderResultFactory.createSuccessResult(
        status,
        avg * filled,
        avg,
        response.data?.[0].fee || 0,
        filled,
        new Date(response.data?.[0].cTime || 0).toISOString()
      );
    }



    // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#all-orders-user_data
    static async loadTradesForClosedOrder(){
      try {
        const params =  this.buildQueryParams({
          symbol: "BTCUSDT",
        });

        const response = await this.callExchangeAPI("/api/v3/myTrades", params);

        return this.convertTradesToCcxtFormat(response ?? {})
      } catch (error) {
        console.warn("Error Fetching Order Details!", error)
        throw new error;
      }
    }

    static convertTradesToCcxtFormat(trades = response) {

      let tradesArray = "";
  
      if (Array.isArray(trades)) {
          tradesArray = trades;
      } else if (trades && typeof trades === 'object') {
          tradesArray = [trades];
      }
  
      const ccxtTrades = tradesArray.map(trade => ({
          order: trade.orderId || "N/A", 
          amount: trade.price || 0,
          baseQty: trade.qty || 0,
          fee: {
              currency: trade.commissionAsset || "N/A",
              cost: Math.abs(trade.commission) || 0,
          },
          error: trade.error || null
      }));
  
      return ccxtTrades;
  }


    // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#klinecandlestick-data
        static async fetchKlines(){
          try {
            const params = {
              symbol: "BTCUSDT",
              interval: "1s",
            }

            const response = await this.callExchangeAPI("/api/v3/klines", params);
            let klines = response.map(kline => [
              kline[0], // time
              kline[1], // open
              kline[2], // high
              kline[3], // low
              kline[4], // close
              0 // no-volume
            ]);
        
            klines.sort((a, b) => a[0] - b[0]); //Sorted By timestamp
        
            return klines;
          } catch (error) {
            console.warn("Error Fetching Klines!", error)
          }
        }
        
}



export default BinanceService;

