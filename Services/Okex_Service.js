import fetch  from 'node-fetch';
import crypto from "crypto";
import UserOrder from "../Models/UserOrder.js";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import NonCcxtExchangeService from "../Order_Result/NonCcxtExchangeService.js";
import sendLogs from '../Log_System/sendLogs.js';
import OrderParam from '../Models/OrderParam.js';
import ExchangePair from '../Models/ExchangePair.js';



class OkexService extends NonCcxtExchangeService{

    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
    
    static STATE_MAP = {
      canceled: OkexService.STATUS_CANCELLED,
      mmp_canceled: OkexService.STATUS_CANCELLED,
      live: OkexService.STATUS_ONGOING,
      partially_filled: OkexService.STATUS_PARTIAL_FILLED,
      filled: OkexService.STATUS_FILLED,
    };

    static BAR_MAPS = {
      "5m": "5m",
      "15m": "15m",
      "30m": "30m",
      "1h": "1H",
      "2h": "2H",
      "4h": "4H",
      "6h": "6H",
      "1d": "1Dutc",
    };

  static userName = process.env.USER_NAME;

  static getBaseUrl() {
    return "https://www.okx.com";
  }

  

  static buildQueryParams(params) {
    return params;
  }


  static endPoints = {
    Balance: "/api/v5/account/balance",
    Place_Order: "/api/v5/trade/order",
    Pending_Order: "/api/v5/trade/orders-pending",
    Cancel_Order: "/api/v5/trade/cancel-order",
    Fetch_Order: "/api/v5/trade/order",
    Trades: "/api/v5/trade/fills",
    klines: "/api/v5/market/history-index-candles",
  };

  static isError(response) {
    return response.code !== 0;
  }

  /**
   * Authentication for this API.
   * @async
   * @param {string} endPoint - Url endpoint.
   * @param {string || number} params - Function parameters.
   * @param {string} method - HTTP Method
   * @returns {Promise<authData>} - Authentication Headers
   */
            static async getCommonHeaders(endPoint = null,params = null,method = "GET") {
              const now = new Date();
              const ts = now.toISOString().replace(/(\.\d{3})\d+/, "$1");
              const Okex_API_KEY = process.env.Okex_API_KEY;
              const Okex_SECRET_KEY = process.env.Okex_SECRET_KEY;
              const passphrase = process.env.PASSPHRASE_KEY;


                  // console.log("okex_key:", Okex_API_KEY)
                  //  console.log("okex_secret:", Okex_SECRET_KEY)

              let queryString = "";
              let body = "";
              let path = endPoint;

              if (method === "GET") {
                queryString =
                  Object?.keys(params ?? {}).length === 0
                    ? ""
                    : "?" +
                      Object.keys(params)
                        .map(
                          (key) =>
                            `${encodeURIComponent(key)}=${encodeURIComponent(
                              params[key]
                            )}`
                        )
                        .join("&");
                path = endPoint + queryString;
              } else {
                body = JSON.stringify(params);
              }

              const signData = `${ts}${method}${path}${body}`;
              const sign = crypto
                .createHmac("sha256", Okex_SECRET_KEY)
                .update(signData)
                .digest("base64");

              return {
                "OK-ACCESS-KEY": Okex_API_KEY,
                "OK-ACCESS-SIGN": sign,
                "OK-ACCESS-TIMESTAMP": ts,
                "OK-ACCESS-PASSPHRASE":passphrase,
                "accept": "application/json",
                "Content-Type": method === "POST" ? "application/json" : undefined,
              };
            }


  /**
   * Exchange API Caller function.
   * @async
   * @param {string} endPoint - Url endpoint.
   * @param {string || number} params - Function parameters.
   * @param {string} method - Function Method
   * @returns {Promise<Object>} -  Fetches data from the API.
   */
          static async callExchangeApi(endPoint, params, method = "GET", log = false) {
            try {
            const headers = await this.getCommonHeaders(endPoint, params, method);

                //LOGS AN ERROR IF ANY AUTH CREDENTIALS MISSING....
              if(!headers){
                await sendLogs.exchangeCritical.critical("Missing Auth Data!", endPoint, this.userName);
              }

            const queryString = new URLSearchParams(params).toString();
            const baseUrl = this.getBaseUrl();
            const url = method === "GET" && queryString ? `${baseUrl}${endPoint}?${queryString}` : `${baseUrl}${endPoint}`;
            method = method.toUpperCase();


              const options = { 
                method,
                headers,
                ...(method === "GET" ? {} : { body: JSON.stringify(params) }),  
              };
              console.log(options)
              const response = await fetch(url, options);
              const data = await response.json();
          
              return data;
            } catch (error) {
              //LOGS AN ERROR IF ANY ISSUE WITH API CALL...
              await sendLogs.exchangeError.error(`${error.message}`, endPoint, this.userName);
              console.error("Error making API call:", error);
              return { error: error.message };
            }
          }



  /**
   * Fetches User balance from exchange
   * @async
   * @returns {Promise<{coins: Array}>} - User Balance Details
   * @see https://www.okx.com/docs-v5/en/#trading-account-rest-api-get-balance
   */
static async fetchBalanceFromExchange() {
  try {
    const response = await this.callExchangeApi(this.endPoints.Balance, {});

    if (!response) {
      const msg = response?.msg ?? response.msg ?? JSON.stringify(response);
      await sendLogs.exchangeError.error(msg ?? "No Response!", this.endPoints.Balance, this.userName);
      throw new Error(msg);
    }

    let result = { coins: [] };

    if (response?.data && Array.isArray(response.data)) {
      response.data.forEach((item) => {
        if (Array.isArray(item.details)) {
          item.details.forEach((coinInfo) => {
            const availBal = parseFloat(coinInfo.availBal);
            const frozenBal = parseFloat(coinInfo.frozenBal);

            if (availBal > 0 || frozenBal > 0) {
              result.coins.push({
                coin: coinInfo.ccy,
                free: availBal,
                used: frozenBal,
                total: availBal + frozenBal,
              });
            }
          });
        }
      });
    }

    //SUCCESS LOG...
    await sendLogs.exchangeInfo.info("Successfully Fetched Balance!", this.endPoints.Balance, this.userName);
    return result;
  } catch (error) {
    //LOGS AN ERROR...
    await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Balance, this.userName);
    console.error("Error fetching balance:", error.message);
    throw error;
  }
}

/**
 * Places Order from exchange
 * @async
 * @param {string} instId - Trading Pair: BTC-USDT
 * @param {string} tdMode - Trading Mode: cash
 * @param {string} side - Buy / sell
 * @param {string} ordType - type of order: limit / market
 * @param {string} px - Order Price
 * @param {string} sz - Quantity to buy or sell
 * @param {string} tgtCcy - Base currency
 * @returns {Promise<object>} - Details of placed Order.
 * @see https://www.okx.com/docs-v5/en/#order-book-trading-trade-post-place-order
 */
 static async  placeOrderOnExchange(ExchangePair, OrderParam) {
  try {
    const params = this.buildQueryParams({
      instId: ExchangePair.getSymbol().toUpperCase(),
      tdMode: ExchangePair.getTdMode(),
      side: OrderParam.getSide(),
      ordType: OrderParam.getType(),
      px: OrderParam.getPrice(),
      sz: OrderParam.getQty(),
      tgtCcy: ExchangePair.gettgtCcy(),
    });

    const response = await this.callExchangeApi(this.endPoints.Place_Order, params, "POST");

    if (this.isError(response)) {
      const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(`${msg}`, this.endPoints.Place_Order, this.userName);
      return PlaceOrderResultFactory.createFalseResult(msg, response);
    }
    const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);

    //SUCCESS LOG...
    await sendLogs.exchangeInfo.info(`${msg || "Order Placed!"}`, this.endPoints.Place_Order, this.userName);
    return await this.createSuccessPlaceOrderResult(response); 
  } catch (error) {
    //LOGS AN ERROR...
    await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Place_Order, this.userName);
    console.error("Error Placing An Order!", error.message);
    throw new error;
  }
}


static async createSuccessPlaceOrderResult(response) {
  try {
    const orderId = response.data??[0].ordId;
    const time = new Date(response.inTime);
    const placeOrderResult = PlaceOrderResultFactory.createSuccessResult(
      orderId,
      UserOrder.STATUS_ONGOING,
      time,
      response,
    );
    return placeOrderResult;
  } catch (error) {
    // WARN LOG...
    await sendLogs.exchangeWarn.warn("Failed To Format The Response", this.endPoints.Place_Order, this.userName);
    console.error("Not Successed!", error.message);
  }
}

  /**
   * Fetches Open Or Pending orders.
   * @async
   * @returns {Promise<Array>} List of open orders with order details.
   * @see https://www.okx.com/docs-v5/en/?shell#order-book-trading-trade-get-order-details
   */
        static async pendingOrders(){
          try {
            const response = await this.callExchangeApi(this.endPoints.Pending_Order, {});

            if(this.isError(response)){
              //LOGS AN ERROR...
              await sendLogs.exchangeError.error(`${response.msg ? "No Response" : ""}`, this.endPoints.Pending_Order, this.userName);
              console.warn("Response Is Not OK!", response);
            }

            //SUCCESS LOG...
            await sendLogs.exchangeInfo.info("Successfully Fetched Pending Order!", this.endPoints.Pending_Order, this.userName);
            return response;
          } catch (error) {
            //LOGS AN ERROR...
            await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Pending_Order, this.userName);
            console.error("Error Fetching Order Details", error.message);
            throw new error;
          }
        }

   /**
   * Cancels an existing order from exchange.
   * @async
   * @param {string} instId - Trading Pair: BTC-USDT
   * @param {number} ordId -  Order ID.
   * @returns {Promise<object>} - Status of order cancellation.
   * @see https://www.okx.com/docs-v5/en/#order-book-trading-trade-post-cancel-order
   */
   static async cancelOrderFromExchange(instId, ordId){
    try {
      const params = this.buildQueryParams({
        instId: instId,
        ordId: ordId,
      });
  
      const response = await this.callExchangeApi(this.endPoints.Cancel_Order, params, "POST");

      if (this.isError(response)) {
        const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error(`${msg}`, this.endPoints.Cancel_Order, this.userName);
        return new CancelOrderResult(false, msg, response);
      }
  
      //SUCCESS LOG...
      await sendLogs.exchangeInfo.info("Order Cancelled!", this.endPoints.Cancel_Order, this.userName);
      return new CancelOrderResult(true, "Success", response);
    } catch (error) {
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Cancel_Order, this.userName);
      console.error("Exchange Is Not Successed!", error.message);
      throw new error;
    }
   }


  /**
   * Fetches Order details from exchange.
   * @async
   * @param {string} instId - Trading Pair: BTC-USDT
   * @param {number} ordId -  Order ID.
   * @returns {Promise<object>} -  Order Details.
   * @see https://www.okx.com/docs-v5/en/#order-book-trading-trade-get-order-details
   */
  static async  fetchOrderFromExchange(instId, ordId) {
    try {
      const params = this.buildQueryParams({
        instId: instId,
        ordId: ordId,
      }); 
      const response = await this.callExchangeApi(this.endPoints.Fetch_Order, params, "GET");

      if(this.isError(response)){
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error(`${response.msg ? "No Response" : ""}`, this.endPoints.Pending_Order, this.userName);
        console.warn("Response Is Not OK!", response);
      }
      
      //SUCCESS LOG...
      await sendLogs.exchangeInfo.info("Order Fetch Successfull!", this.endPoints.Fetch_Order, this.userName);
      return await this.createFetchOrderResultFromResponse(response);
    } catch (error) {
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Fetch_Order, this.userName);
      console.error("Error Fetching Order!", error.message);
      throw new error;
    }
  }

 static async createFetchOrderResultFromResponse(response) {
  try {
    if (response === null || response.code > 0) {
      const failureMsg =
        response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(`${failureMsg}`, this.endPoints.Fetch_Order, this.userName);
      return FetchOrderResultFactory.createFalseResult(failureMsg);
    }
  
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
  } catch (error) {
      // WARN LOG...
      await sendLogs.exchangeWarn.warn("Failed To Format The Response", this.endPoints.Fetch_Order, this.userName);
      console.warn("Error Fetching Order Details!", error.message);
      throw new error;
  }
}

  /**
   * Fetches my recent trades.
   * @async
   * @returns {Promise<object>} - List of recent trades.
   * @see https://www.okx.com/docs-v5/en/#order-book-trading-trade-get-transaction-details-last-3-days
   */
  static async loadTradesForClosedOrder() {
    try {
      const response = await this.callExchangeApi(this.endPoints.Trades, {});
      // console.log(response);

      if(!response){
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error(`${failureMsg}`, this.endPoints.Trades, this.userName);
        console.warn("Response Is Not OK!", response);
      }

      //SUCCESS LOG...
      await sendLogs.exchangeInfo.info('Operation Succesfull!', this.endPoints.Trades, this.userName);
      return await this.convertTradesToCcxtFormat(response ?? {});
    } catch (error) {
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Trades, this.userName);
      console.error("Error Fetching Trades!", error.message);
      throw new error;
    }
  }

  static async convertTradesToCcxtFormat(trades = response) {
      try {
        let tradesArray = [];
        

        if (Array.isArray(trades)) {
          tradesArray = trades;
        } else if (trades && typeof trades === 'object') {
          tradesArray = [trades];
        }

        const ccxtTrades = tradesArray.map(trade => ({
          order: trade.ordId || "N/A",
          amount: trade.fillSz || 0,
          baseQty: trade.fillSz || 0,
          fee: {
            currency: trade.feeCcy || "N/A",
            cost: Math.abs(trade.fee) || 0,
          },
          error: trade.error || null
        }));

        return ccxtTrades;
      } catch (error) {
          // WARN LOG...
          await sendLogs.exchangeWarn.warn("Failed To Format The Response", this.endPoints.Trades, this.userName);
          console.warn("Error Fetching Order Details!", error.message);
          throw new error;
        
      }
  }
  
  

  /**
   * Fetches market candles from exchange
   * @async
   * @param {string} instId - Trading Pair: BTC-USDT
   * @param {string} bar - Time Range In sec: 1m
   * @returns {Promise <Array>} List of candles data.
   * @see https://www.okx.com/docs-v5/en/#public-data-rest-api-get-index-candlesticks-history
   */
  static async fetchKlines(instId, bar) {
    try {
      const params = this.buildQueryParams({
        instId: instId,
        bar: this.BAR_MAPS[bar],
      });
  
      const response = await this.callExchangeApi(this.endPoints.klines, params);

      //LOGS AN ERROR...
      if (Array.isArray(response.data) && response.data.length === 0) {
        console.error('Unexpected response format:', response);
        await sendLogs.exchangeError.error( "No Klines data found", this.endPoints.klines, this.userName);
        return; // Exit early if there is no data
      };
  
      let klines = response.data.map(kline => [
        kline[0], // time
        kline[1], // open
        kline[2], // high
        kline[3], // low
        kline[4], // close
        0 // no-volume
      ]);
  
      klines.sort((a, b) => a[0] - b[0]);
  
      //SUCCESS LOG...
      await sendLogs.exchangeInfo.info( 'Operation Succesfull!', this.endPoints.klines, this.userName);
      return klines;
    } catch (error) {
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error( `${error.message}`, this.endPoints.klines, this.userName);
      console.error("Error Fetching Kline!", error.message);
      throw error;
    }
  }
  

}


export default OkexService; 