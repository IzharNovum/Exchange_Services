import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js"
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import dotenv from "dotenv";
import sendLogs from "../Log_System/sendLogs.js";
import OrderParam from "../Models/OrderParam.js";
import ExchangePair from "../Models/ExchangePair.js";


dotenv.config({ path: './Config/.env' });

class huobiExchange{


    static STATUS_PARTIAL_FILLED = "partial_filled";
    static STATUS_CANCELLED = "cancelled";
    static STATUS_FILLED = "filled";
    static STATUS_ONGOING = "ongoing";
  
    static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"]
    static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
    static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  
    static STATE_MAP = {
      canceled: huobiExchange.STATUS_CANCELLED,
      mmp_canceled: huobiExchange.STATUS_CANCELLED,
      live: huobiExchange.STATUS_ONGOING,
      partially_filled: huobiExchange.STATUS_PARTIAL_FILLED,
      filled: huobiExchange.STATUS_FILLED,
    };

    static HUOBI_INTERVALS = {
        "5m": "5min",
        "15m": "15min",
        "30m": "30min",
        "1h": "60min",
        "4h": "4hour",
        "1d": "1d",
        "1M": "1mon",
      };

      /**
       * Instance of the classes.
       */
    //   static OrderParam =  new OrderParam();
    //   static ExchangePair =  new ExchangePair();


    static userName = process.env.USER_NAME;


    static getBaseUrl(){
        return "https://api.huobi.pro";
    }

    static buildQueryParams(params){
        return params;
    }

    static endPoints = {
        Account : "/v1/account/accounts",
        Balance:(accountId) => `/v1/account/accounts/${accountId}/balance`,
        Place_Order: "/v1/order/orders/place",
        Pending_Order: "/v1/order/openOrders",
        Cancel_Order:(orderID) => `/v1/order/orders/${orderID}/submitcancel`,
        Fetch_Order:(orderID) => `/v1/order/orders/${orderID}`,
        Trades: "/v1/order/history",
        klines: "/market/history/kline",
      };
    
      static isError(response) {
        return !response || response.status !== "ok" || response.code !== 200 ;
      }
      
    
      /**
       * Authentication for this API.
       * @async
       * @param {string} endPoint - Url endpoint.
       * @param {string || number} params - Function parameters.
       * @param {string} method - HTTP Method
       * @returns {Promise<authData>} - Authentication Headers
       */
    static async authentication(endPoint = "", params = {}, method = "GET") {
        const now = new Date();
        const isoFormat = now.toISOString().replace(/\.\d{3}Z$/, "");
        const HUOBI_API_KEY = process.env.Huobi_API_KEY;
        const HUOBI_SECRET_KEY = process.env.Huobi_SECRET_KEY;
        const SignatureMethod = "HmacSHA256";
        const SignatureVersion = "2";
        const TimeStamp = encodeURIComponent(isoFormat);
        const host = this.getBaseUrl().replace(/^https?:\/\//, '');    
        
        // console.log('Huobi_API_Key:', process.env.Huobi_API_KEY);
        // console.log('Huobi_SECRET_Key:', process.env.Huobi_SECRET_KEY);

        let queryString = "";
        let body = "";

        if (method === "GET") {
            queryString = Object.keys(params ?? {}).length === 0 ? "" : "?" + Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
        } else {
            body = JSON.stringify(params);
        }

        // GENERATING SIGNATURE...
        const authKeys = `AccessKeyId=${HUOBI_API_KEY}&SignatureMethod=${SignatureMethod}&SignatureVersion=${SignatureVersion}&Timestamp=${TimeStamp}` + (queryString ? `&${queryString.substring(1)}` : "");
        const preSigned = `${method}\n${host}\n${endPoint}\n${authKeys}`;
        const raw_signature = crypto.createHmac("sha256", HUOBI_SECRET_KEY).update(preSigned).digest("base64");
        const Signature = encodeURIComponent(raw_signature);

        const url = `https://${host}${endPoint}?AccessKeyId=${HUOBI_API_KEY}&SignatureMethod=${SignatureMethod}&SignatureVersion=${SignatureVersion}&Timestamp=${TimeStamp}${queryString ? `&${queryString.substring(1)}` : ""}&Signature=${Signature}`;

        return { url, body };
    }


  /**
   * Exchange API Caller function.
   * @async
   * @param {string} endPoint - Url endpoint.
   * @param {string || number} params - Function parameters.
   * @param {string} method - Function Method
   * @returns {Promise<Object>} -  Fetches data from the API.
   */
    static async callExchangeAPI(endPoint, params, method = "GET") {
        try {
            const { url, body } = await this.authentication(endPoint, params, method);
            //LOGS AN ERROR IF ANY AUTH CREDENTIALS MISSING....
            if(!url){
                await sendLogs.exchangeCritical.critical("Missing Auth Data!", endPoint, this.userName);
            }

            const options = {
                    method,
                    body: method === "POST" ? body : undefined,
                    headers: {
                        "Content-Type": "application/json",
                    }
            }

            console.log("COMMO TESTINNG:", options)

            const fetchData = await fetch(url, options);
            const response = await fetchData.json();

            if (!fetchData.ok) {
                console.error("FetchData Is Not OK!", fetchData.status);
                throw new Error(response.message || `HTTP error! status: ${fetchData.status}`);
            }

            // console.log("Response Data:", response);
            return response;
        } catch (error) {
            //LOGS AN ERROR IF ANY ISSUE WITH API CALL...
            await sendLogs.exchangeError.error(`${error.message}`, endPoint, this.userName);
            console.warn("API Call Failed!", error.message);
            throw error;
        }
    }

    /**
     * Fetches Account Details from exchange
     * @async
     * @returns {Promise<object>} - Account Details
     * @see https://huobiapi.github.io/docs/spot/v1/en/#get-all-accounts-of-the-current-user
     */
    static async accountDetails(){
        try {
            const response = await this.callExchangeAPI(this.endPoints.Account, {});
            console.log("Full Response:", response);

            if (this.isError(response)) {
                //LOGS AN ERROR...
                await sendLogs.exchangeError.error( "No Response!", this.endPoints.Account, this.userName);
                console.error("Response Is Not OK!", response["err-msg"]);
                throw new Error(`API Error: ${response["err-msg"]}`);
            }
    
        //SUCCESS LOG...
        await sendLogs.exchangeInfo.info( 'Successfully Fetched Account Details!', this.endPoints.Account, this.userName);
        return response;
        } catch (error) {
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Account, this.userName);
        console.error("Error fetching balance:", error.message);
        throw error;
        }
    }

    /**
     * Fetchs User Balance from exchange
     * @async
     * @param {number} accountId - Account ID
     * @returns {Promise<object>} - User balance
     * @see https://huobiapi.github.io/docs/spot/v1/en/#get-account-balance-of-a-specific-account
     */

    static async fetchBalanceOnExchange(ExchangePair){
        try {
            const accountId = ExchangePair.getAccID();
            const response = await this.callExchangeAPI(this.endPoints.Balance(accountId), {});

            if(this.isError(response)){
                //LOGS AN ERROR...
                await sendLogs.exchangeError.error( "No Response!", this.endPoints.Balance(accountId), this.userName);
                console.warn("Response Is Not OK!", response);
              } 
                let result = { coins: [] };

                if (response?.data?.list && Array.isArray(response.data.list)) {
                    let hasValidCoin = false; // Flag to track if any valid coin was added

                    response.data.list.forEach((coinInfo) => {
                        let availBal = 0;
                        let frozenBal = 0;

                        // For trade balance
                        if (coinInfo.type === "trade") {
                            availBal = coinInfo.available ? parseFloat(coinInfo.available) : 0;
                        }

                        // For frozen balance
                        if (coinInfo.type === "frozen") {
                            frozenBal = coinInfo.balance ? parseFloat(coinInfo.balance) : 0;
                        }

                        if (availBal > 0 || frozenBal > 0) {
                            result.coins.push({
                                coin: coinInfo.currency,
                                type: coinInfo.type,
                                free: availBal,
                                used: frozenBal,    
                                total: availBal + frozenBal,
                            });
                            hasValidCoin = true; //flag if there's any valid cois for trading!
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
        await sendLogs.exchangeInfo.info("Successfully Fetched Balance!", this.endPoints.Balance(accountId), this.userName);
        return result;
        } catch (error) {
        //LOGS AN ERROR...  
        await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Balance(accountId), this.userName);
        console.error("Error fetching balance:", error.message);
        throw error;
        }
    }
  
    /**
     * Places order from exchange
     * @async
     * @param {number} accountId - Account ID
     * @param {string} symbol - Trading Pair: btcusdt
     * @param {string} type - buy-limit
     * @param {number} amount - amount of the order
     * @param {number} price - Price of the order
     * @returns {Promise<object>} - Details of placed Order.
     * @see https://huobiapi.github.io/docs/spot/v1/en/#place-a-new-order
     */

    // static async placeOrderOnExchange({symbol, side, price, quantity}){
    static async placeOrderOnExchange(ExchangePair, OrderParam, symbol){

        try {
            const params = this.buildQueryParams({
                "account-id" : ExchangePair.getAccID(),
                symbol: OrderParam.getSymbol(),
                type: OrderParam.getSide(),
                price: OrderParam.getPrice(),
                amount: OrderParam.getQty(),

            });

            const response = await this.callExchangeAPI(this.endPoints.Place_Order, params, "POST");

            if (this.isError(response)) {
                const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
            //LOGS AN ERROR...
            await sendLogs.exchangeError.error(`${msg}`, this.endPoints.Place_Order, this.userName);
            return PlaceOrderResultFactory.createFalseResult(msg, response);
              };

            const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);

            //SUCCESS LOG...
            await sendLogs.exchangeInfo.info(`${msg || "Order Placed!"}`, this.endPoints.Place_Order, this.userName); 
            return await this.createSuccessPlaceOrderResult(response);
        } catch (error) {
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Place_Order, this.userName);
        console.error("Error Placing An Order!", error.message);
        throw error;
        }
    }


    static async  createSuccessPlaceOrderResult(response) {
        try {
            const orderId = response?.data;
            const time = new Date();
            const placeOrderResult = PlaceOrderResultFactory.createSuccessResult(
                orderId,
                UserOrder.STATUS_ONGOING,
                time,
                response,
            );
              return placeOrderResult;
        } catch (error) {
              await sendLogs.exchangeWarn.warn("Failed To Format The Response", endPoint, this.userName);
              console.error("Format Not Successed!", error.message);
        }
    }

    
  /**
   * Fetches Open Or Pending orders.
   * @async
   * @returns {Promise<Array>} List of open orders with order details.
   * @see https://huobiapi.github.io/docs/spot/v1/en/#get-all-open-orders
   */
    static async pendingOrders(){
        try {
            const response = await this.callExchangeAPI(this.endPoints.Pending_Order, {});

            if (this.isError(response)) {
                //LOGS AN ERROR...
                await sendLogs.exchangeError.error("No Response!", this.endPoints.Pending_Order, this.userName);
                console.error("Response Is Not OK!", response);
            }

          //SUCCESS LOG...
          await sendLogs.exchangeInfo.info("Successfully Fetched Pending Order!", this.endPoints.Pending_Order, this.userName);
          return response;
        } catch (error) {
          //LOGS AN ERROR...
          await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Pending_Order, this.userName);
          console.warn("Error Fetching Pending Orders!", error.message);
          throw new error;
        }
    }

    /**
   * Cancels an existing order from exchange.
   * @async
   * @param {number} orderId -  Order ID.
   * @returns {Promise<object>} - Status of order cancellation.
   * @see https://huobiapi.github.io/docs/spot/v1/en/#submit-cancel-for-an-order
   */
 
    static async cancelOrderFromExchange(orderID) {
        try {
            const response = await this.callExchangeAPI(this.endPoints.Cancel_Order(orderID), {}, "POST");
    
            if (this.isError(response)) {
                const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                //LOGS AN ERROR...
                await sendLogs.exchangeError.error(`${msg}`, this.endPoints.Cancel_Order(orderID), this.userName);
                return new CancelOrderResult(false, msg, response);
            }
    
            //SUCCESS LOG...
            await sendLogs.exchangeInfo.info("Order Cancelled!", this.endPoints.Cancel_Order(orderID), this.userName);
            return new CancelOrderResult(true, "Success", response);
        } catch (error) {
            //LOGS AN ERROR...
            await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Cancel_Order(orderID), this.userName);
            console.warn("Error Cancelling An Order!", error.message);
            throw new error;
        }
    }

    /**
   * Fetches Order details from exchange.
   * @async
   * @param {number} orderId -  Order ID.
   * @returns {Promise<object>} -  Order Details.
   * @see https://huobiapi.github.io/docs/spot/v1/en/#get-the-order-detail-of-an-order
   */

    static async fetchOrderFromExchange(orderID){
        try {
            const response = await this.callExchangeAPI(this.endPoints.Fetch_Order(orderID), {});
    
            if (this.isError(response)) {
                const failureMsg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                // LOGS AN ERROR...
                await sendLogs.exchangeError.error(`${failureMsg}`, this.endPoints.Fetch_Order(orderID), this.userName);
                return FetchOrderResultFactory.createFalseResult(failureMsg);
            }
    
            //SUCCESS LOG...
            await sendLogs.exchangeInfo.info("Order Fetch Successfull!", this.endPoints.Fetch_Order(orderID), this.userName);
            return await this.createFetchOrderResultFromResponse(response);
        } catch (error) {
            //LOGS AN ERROR...
            await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Fetch_Order(orderID), this.userName);
            console.warn("Error Fetching Order Details!", error.message);
            throw new error;
        }
    }

    static async createFetchOrderResultFromResponse(response) {      
      try {
        const status =
        this.STATE_MAP[response.data?.state] ?? UserOrder.STATUS_ONGOING;
        const avg = parseFloat(response.data?.price) || 0;
        const filled = parseFloat(response.data?.['field-amount']) || 0;          
    
      return FetchOrderResultFactory.createSuccessResult(
        status,                              //order status
        avg * filled,                        //total cost
        avg,                                 //price coz of no avg in res
        response.data?.['field-fees'] || 0,  //fee
        filled,                              //filled amount
        new Date(response.data?.[0].cTime || 0).toISOString() //Time
      );
      } catch (error) {
        // WARN LOG...
        await sendLogs.exchangeWarn.warn("Failed To Format The Response", this.endPoints.Fetch_Order(orderID), this.userName);
        console.warn("Error Fetching Order Details!", error.message);
        throw new error;
      }
    }

  /**
   * Fetches my recent trades.
   * @async
   * @returns {Promise<object>} - List of recent trades.
   * @see https://huobiapi.github.io/docs/spot/v1/en/#search-historical-orders-within-48-hours
   */
    static async loadTradesForClosedOrder() {
        try {
            const response = await this.callExchangeAPI(this.endPoints.Trades, {});
            // console.log("responsne:", response)
    
            if (response.status !== "ok"){
                const failureMsg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                //LOGS AN ERROR...
                await sendLogs.exchangeError.error(`${failureMsg}`, this.endPoints.Trades, this.userName);
                console.error("Response Is Not OK!", response["err-msg"]);
                throw new Error(`API Error: ${response["err-msg"]}`);
            }

        //SUCCESS LOG...
        await sendLogs.exchangeInfo.info('Operation Succesfull!', this.endPoints.Trades, this.userName);
        return this.convertTradesToCcxtFormat(response ?? {});
        } catch (error) {
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error(`${error.message}`, this.endPoints.Trades, this.userName);
        console.error("Error Fetching Trades", error);
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
                order: trade.id || "N/A",  //'id' to 'order'
                amount: parseFloat(trade['field-amount']) || 0,  //'field-amount' to 'amount'
                baseQty: parseFloat(trade['field-amount']) || 0,  //'field-amount' to 'baseQty'
                fee: {
                    currency: trade.symbol || "N/A",  //'symbol' to 'feeCcy'
                    cost: Math.abs(parseFloat(trade['field-fees'])) || 0,  //'field-fees' to 'cost'
                },
                error: trade.error || null  // Set 'error' if the state is not 'submitted'
            }));
            
            console.log("responsne:", ccxtTrades);
            
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
     * @param {string} symbol - Trading Pair: btcusdt
     * @param {string} period - Time range : 1min
     * @returns {Promise <Array>} List of candles data.
     * @see https://huobiapi.github.io/docs/spot/v1/en/#get-klines-candles
     */
    static async fetchKlines(symbol, period){
        try {
            const params = this.buildQueryParams({
                symbol : symbol,
                period : this.HUOBI_INTERVALS[period],
            });

            const response = await this.callExchangeAPI(this.endPoints.klines, params);

            if (response.status !== "ok") {
                const failureMsg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
                //LOGS AN ERROR...
                await sendLogs.exchangeError.error(`${failureMsg}`, this.endPoints.klines, this.userName);
                console.error("Response Is Not OK!", response["err-msg"]);
                throw new Error(`API Error: ${response["err-msg"]}`);
            }

            let klines = response.data.map(kline => ({
                id  : kline.id,      // ID or timestamp
                open: kline.open,    // Open price
                high: kline.high,    // High price
                low : kline.low,     // Low price
               close: kline.close,   // Close price
              amount: kline.amount,  // Amount
                 vol: kline.vol,     // Volume
               count: kline.count    // Count
              }));
          
              klines.sort((a, b) => a.id - b.id); //Sorted By ID
          
            //SUCCESS LOG...
            await sendLogs.exchangeInfo.info( 'Operation Succesfull!', this.endPoints.klines, this.userName);
            return klines;
        } catch (error) {
            //LOGS AN ERROR...
            await sendLogs.exchangeError.error( `${error.message}`, this.endPoints.klines, this.userName);
            console.error("Error Fetching Klines!", error);
            throw error;
        }
    }

}


export default huobiExchange;