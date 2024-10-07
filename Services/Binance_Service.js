import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import { response } from "express";
import sendLogs from "../Log_System/sendLogs.js";


class BinanceService{

  static STATUS_PARTIAL_FILLED = "partial_filled";
  static STATUS_CANCELLED = "cancelled";
  static STATUS_FILLED = "filled";
  static STATUS_ONGOING = "ongoing";

  static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
  static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
  static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
  static STATE_MAP = {
    canceled: BinanceService.STATUS_CANCELLED,
    mmp_canceled: BinanceService.STATUS_CANCELLED,
    live: BinanceService.STATUS_ONGOING,
    partially_filled: BinanceService.STATUS_PARTIAL_FILLED,
    filled: BinanceService.STATUS_FILLED,
  };

  static userName = process.env.USER_NAME;


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

                //LOGS AN ERROR IF ANY AUTH CREDENTIALS MISSING....
                if(!url || !headers){
                  await sendLogs.exchangeCritical.critical("Missing Auth Data!", endPoint, this.userName);
                }

                const options = {
                    method,
                    headers,
                };

                const fetchData = await fetch(url, options);
                const response = await fetchData.json();

                return response;
            } catch (error) {
              //LOGS AN ERROR IF ANY ISSUE WITH API CALL...
                await sendLogs.exchangeError.error(`${error.message}`, endPoint, this.userName);
                console.error("Error CallExchangeAPI!", error);
                throw error;
            }
        }




  // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#account-information-user_data
      static async fetchBalanceOnExchange(){
        const endPoint = "/api/v3/account";
        try {
          const response = await this.callExchangeAPI(endPoint, {});

          if(!response){
            //LOGS AN ERROR...
            await sendLogs.exchangeError.error("No Response!", endPoint, this.userName);
            console.warn("Response Is Not OK!", response);
            throw error;
          }

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

        //SUCCESS LOG...
        await sendLogs.exchangeInfo.info("Successfully Fetched Balance!", endPoint, this.userName);
        return result;
        } catch (error) {
        //LOGS AN ERROR...
          await sendLogs.exchangeError.error(`${error.message}`, endPoint, this.userName);
          console.error("Error fetching balance:", error.message);
          throw error;
        }
      }


  // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#new-order-trade
  static async placeOrderOnExchange(){
      const endPoint = "/api/v3/order";
    try {
      const params = this.buildQueryParams({
              symbol: "BTCUSDT",
              side: "BUY",
              type: "LIMIT",
              price: 30000,
              quantity: 1,
              timeInForce: "GTC", //Good Till Cancel
      });

      const response = await this.callExchangeAPI(endPoint, params, "POST"); 

      if(response.status !== 200){
        const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
        //LOGS AN ERROR...
         await sendLogs.exchangeError.error(`${msg}`, endPoint, this.userName);
        return PlaceOrderResultFactory.createFalseResult(msg, response);
      }

      const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
      //SUCCESS LOG...
      await sendLogs.exchangeInfo.info(`${msg || "Order Placed!"}`, endPoint, this.userName);
      return await this.createSuccessPlaceOrderResult(response);
    } catch (error) {
        //LOGS AN ERROR...
      await sendLogs.exchangeError.error(`${error.message}`, endPoint, this.userName);
      console.warn("Error Placing An Order!", error.message);
      throw new error;
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
      // WARN LOG...
      await sendLogs.exchangeWarn.warn("Failed To Format The Response", endPoint, this.userName);
      console.error("Format Not Successed!", error.message);
    }
}


  // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#current-open-orders-user_data
  static async pendingOrders(){
        const endPoint = "/api/v3/openOrders"
    try {
      const response = await this.callExchangeAPI(endPoint, {});

      if(!response){
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error("No Response!", endPoint, this.userName);
        console.warn("Response Is Not OK!", response);
      }
          //SUCCESS LOG...
       await sendLogs.exchangeInfo.info("Successfully Fetched Pending Order!", endPoint, this.userName);
      return response;
    } catch (error) {
              //LOGS AN ERROR...
      await sendLogs.exchangeError.error(`${error.message}`, endPoint, this.userName);
      console.warn("Error Fetching Pending Orders!", error.message);
      throw new error;
    }
  }


  // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#cancel-order-trade
    static async cancelOrderFromExchange(orderId) {
      const endPoint = "/api/v3/order";
      try {
        const params = this.buildQueryParams({
          symbol: "BTCUSDT",
          orderId: "2711992218",
        });

         const response = await this.callExchangeAPI(endPoint, params, "DELETE");

         if(response.status !== 200){
          const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
          //LOGS AN ERROR...
          await sendLogs.exchangeError.error(`${msg}`, endPoint, this.userName);
          return new CancelOrderResult(false, msg, response);
        }

        //SUCCESS LOG...
        await sendLogs.exchangeInfo.info("Order Cancelled!", endPoint, this.userName);
        return new CancelOrderResult(true, "Success", response);
      } catch (error) {
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(`${error.message}`, endPoint, this.userName);
      console.warn("Error Cancelling An Order!", error.message);
      throw new error;
      }
    }

    // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#query-order-user_data
    static async fetchOrderFromExchange(orderId){
      const endPoint = "/api/v3/order";
      try {
        const params =  this.buildQueryParams({
          symbol: "BTCUSDT",
          orderId: "271199228",
        });

        const response = await this.callExchangeAPI(endPoint, params);

        if (!response || !response.orderId || response.executedQty === undefined || response.executedQty === 0) {
          const failureMsg =
            response?.sMsg ?? response.msg ?? "Unexpected response format or missing critical fields.";
          // LOGS AN ERROR...
          await sendLogs.exchangeError.error(`${failureMsg}`, endPoint, this.userName);
          return FetchOrderResultFactory.createFalseResult(failureMsg);
        }
        

        //SUCCESS LOG...
        await sendLogs.exchangeInfo.info("Order Fetch Successfull!", endPoint, this.userName);
        return this.createFetchOrderResultFromResponse(response);
      } catch (error) {
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error(`${error.message}`, endPoint, this.userName);
        console.warn("Error Fetching Order Details!", error.message);
        throw new error;
      }
    }

    static createFetchOrderResultFromResponse(response) {      
      const status = this.STATE_MAP[response.status] ?? UserOrder.STATUS_ONGOING;
      const avg = parseFloat(response.cummulativeQuoteQty) / parseFloat(response.executedQty) || 0;
      const filled = parseFloat(response.executedQty) || 0;
    
      return FetchOrderResultFactory.createSuccessResult(
        status,        //order status
        avg * filled, // Total cost
        avg,          // Average price
        0,            // No Fee Avail In res
        filled,       // Filled quantity
        new Date(response.time).toISOString() // Time
      );
    }
    

    // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#account-trade-list-user_data
    static async loadTradesForClosedOrder(){
      const endPoint = "/api/v3/myTrades";
      try {
        const params =  this.buildQueryParams({
          symbol: "BTCUSDT",
        });

        const response = await this.callExchangeAPI(endPoint, params);

        //SUCCESS LOG...
        await sendLogs.exchangeInfo.info('Operation Succesfull!', endPoint, this.userName);
        return this.convertTradesToCcxtFormat(response ?? {});
      } catch (error) {
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error(`${error.message}`, endPoint, this.userName);
        console.error("Error Fetching Trades", error)
        throw new error;
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
            baseQty: trade.qty || 0,
            fee: {
                currency: trade.commissionAsset || "N/A",
                cost: Math.abs(trade.commission) || 0,
            },
            error: trade.error || null
        }));
    
        return ccxtTrades;
      } catch (error) {
          // WARN LOG...
          await sendLogs.exchangeWarn.warn("Failed To Format The Response", endPoint, this.userName);
          console.warn("Error Fetching Order Details!", error.message);
          throw new error;
      }
  }


    // https://developers.binance.com/docs/binance-spot-api-docs/rest-api#klinecandlestick-data
        static async fetchKlines(){
          const endPoint = "/api/v3/klines";
          try {
            const params = {
              symbol: "BTCUSDT",
              interval: "1s",
            }

            const response = await this.callExchangeAPI(endPoint, params);

                    //LOGS AN ERROR...
            if (Array.isArray(response.data) && response.data.length === 0) {
              await sendLogs.exchangeError.error("No Klines data found", endPoint, this.userName);
              return; // Exit early if there is no data
            }

            let klines = response.map(kline => [
              kline[0], // time
              kline[1], // open
              kline[2], // high
              kline[3], // low
              kline[4], // close
              0 // no-volume
            ]);
        
            klines.sort((a, b) => a[0] - b[0]); //Sorted By timestamp
        
            //SUCCESS LOG...
            await sendLogs.exchangeInfo.info( 'Operation Succesfull!', endPoint, this.userName);
            return klines;
          } catch (error) {
            //LOGS AN ERROR...
            await sendLogs.exchangeError.error( `${error.message}`, endPoint, this.userName);
            console.warn("Error Fetching Klines!", error);
            throw new error;
          }
        }
        
}


export default BinanceService;