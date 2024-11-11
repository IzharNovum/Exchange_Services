import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js";
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import OrderParam from "../Models/OrderParam.js";

class Kraken {

  static STATUS_PARTIAL_FILLED = "partial_filled";
  static STATUS_CANCELLED = "cancelled";
  static STATUS_FILLED = "filled";
  static STATUS_ONGOING = "ongoing";

  static STATUS_OPENS_CCXT = ["open", "new", "NEW", "ongoing"];
  static STATUS_CANCELS_CCXT = ["CANCELLED", "cancelled", "CANCELED"];
  static STATUS_FILLED_CCXT = ["FILLED", "filled", "closed", "CLOSED"];
  static section = [ "last", "hist"];

  static STATE_MAP = {
    canceled: Kraken.STATUS_CANCELLED,
    mmp_canceled: Kraken.STATUS_CANCELLED,
    live: Kraken.STATUS_ONGOING,
    partially_filled: Kraken.STATUS_PARTIAL_FILLED,
    filled: Kraken.STATUS_FILLED,
  };

  static KRAK_INTERVALS = {
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "1h": "60",
    "4h": "240",
    "1d": "1440"
  };

  static OrderParam = new OrderParam();


  static getBaseUrl() {
    return "https://api.kraken.com";
  }

  static buildQueryParams(params) {
    return params;
  }




  static endPoints = {
    Balance : "BalanceEx",
    Place_Order : "AddOrder",
    Pending_Order : "OpenOrders",
    Cancel_Order : "CancelOrder",
    Fetch_Order : "QueryOrders",
    Trades : "TradesHistory",
    klines : "" //Defined in function.
  }

  static isError(response){
    return !response?.result || (Array.isArray(response.error) && response.error.length > 0);
  }

/**
 * Authentication for this API.
 * @async
 * @param {string} endPoint - Url endpoint.
 * @param {string || number} params - Function parameters.  
 * @param {string} method - HTTP Method
 * @returns {Promise<authData>} - Authentication data. 
 */
  static async Authentication(endPoint = null, params = {}, method = "GET") {
    const nonce = Date.now().toString();
    const baseUrl = this.getBaseUrl();

    // API Key and Secret Key
      const api_key = process.env.API_KEY_Kraken;
      const secret_key = process.env.SECRECT_KEY_Kraken;

    params.nonce = nonce;
    const body = `${
      method === "POST" ? new URLSearchParams(params).toString() : ""
    }`;
    console.warn("body:", body);
    const decodedSecret = Buffer.from(secret_key, "base64");
    const sha256Hash = crypto
      .createHash("sha256")
      .update(nonce + body)
      .digest();
    const path = `/0/private/${endPoint}`;
    const preSigned = Buffer.concat([Buffer.from(path), sha256Hash]);
    const signature = crypto
      .createHmac("sha512", decodedSecret)
      .update(preSigned)
      .digest("base64");

    console.log("signature:", signature);

    let queryString = "";
    if (method === "GET") {
      queryString =
        Object.keys(params ?? {}).length === 0
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
    }

    const url = `${baseUrl}${path}${method === "GET" ? queryString : ""}`;

    return {
      url,
      headers: {
        "API-Key": api_key,
        "API-Sign": signature,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      queryString,
    };
  }

  /**
 * Exchange API Caller function.
 * @async
 * @param {string} endPoint - Url endpoint.
 * @param {string || number} params - Function parameters.  
 * @param {string} method - Function Method
 * @returns {Promise<Object>} - Fetches data from the API.
 */
  static async callExchangeAPI(endPoint, params, method = "GET") {
    try {
      const { headers, url, body, queryString } = await this.Authentication(
        endPoint,
        params,
        method
      );

      console.log("query", queryString);
      const options = {
        method,
        headers,
        ...(method === "GET" ? { queryString } : { body }),
      };

      const response = await fetch(url, options);
      const data = await response.json();

      // Uncomment for debugging
      // console.log("Response Data:", data);
      // if (!data.result) {
      //     console.error("API Error:", data);
      // }

      return data;
    } catch (error) {
      console.error("API Error In Call Exchange:", error);
      throw error;
    }
  }
  /**
 * Fecthes User balance from the exchange.
 * @async
 * @returns {Promise<{coins: Array}>} - User Balance-data
 * @see https://docs.kraken.com/api/docs/rest-api/get-account-balance
 */


  static async fetchBalanceOnExchange() {
    try {
      const response = await this.callExchangeAPI(this.endPoints.Balance, {}, "POST");

      if (this.isError(response)) {
        console.error("Error message from response", response.error || "Unknown error");
        throw new Error(response.error || "Unknown error occuried");
      };

      let result = { coins: [] };

      console.log("API Response:", response);

      if (response?.result && Object.keys(response.result).length > 0) {
        // Iterating over each currency in the result object
        for (const [coin, info] of Object.entries(response.result)) {
          const availBal = parseFloat(info.balance) || 0; // Available balance
          const frozenBal = parseFloat(info.hold_trade) || 0; // Frozen balance

          if (availBal > 0 || frozenBal > 0) {
            result.coins.push({
              coin: coin,
              free: availBal,
              used: frozenBal,
              total: availBal + frozenBal,
            });
          }
        }
      } else {
        // If the result is empty, it provides a message
        console.log("No balances available for the account.");
        result.coins.push({
          coin: "N/A",
          free: 0,
          used: 0,
          total: 0,
        });
      }

      console.log(result);

      console.log("Response From API:", response);

      return result;
    } catch (error) {
      console.error("Error Fetching Balance", error);
      throw error;
    }
  }

      /**
       * Places an order from exchange
       * @async
       * @param {string} ordertype - market / limit
       * @param {string} type - buy / sell
       * @param {string} volume - order quantity
       * @param {string} pair - Trading pair : BTCUSDT
       * @param {string} price - order price
       * @returns {Promise<Object>} - Details of the placed order.
       * @see https://docs.kraken.com/api/docs/rest-api/add-order
       */
  static async placeOrderOnExchange(OrderParam) {
    try {
      const params = this.buildQueryParams({
        ordertype: OrderParam.getType(),
        type: OrderParam.getSide(),
        volume: OrderParam.getQty(),
        pair: OrderParam.getSymbol(),
        price: OrderParam.getPrice(),
      });

      const response = await this.callExchangeAPI(this.endPoints.Place_Order, params, "POST");

      if (!response.result) {
        const errMgs = response.error ?? JSON.stringify(response);
        return PlaceOrderResultFactory.createFalseResult(errMgs, response);
      }

      console.log("Success Response From API:", response);

      return await this.createSuccessPlaceOrderResult(response);
    } catch (error) {
      console.error("Error Placing an order", error);
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
        response
      );
      return placeOrderResult;
    } catch (error) {
      console.error("Format Not Successed!", error.message);
      throw error;
    }
  }

  /**
 * Fecthes open or pending orders from the exchange.
 * @async
 * @returns {Promise<{object}>} - List of pending orders.
 * @see  https://docs.kraken.com/api/docs/rest-api/get-open-orders
 */

  static async pendingOrders() {
    try {
      const response = await this.callExchangeAPI(this.endPoints.Pending_Order, {}, "POST");

      if (this.isError(response)) {
        const errMgs = response.msg ?? JSON.stringify(response);
        return errMgs;
      }

      // console.log("Success Response From API:", response);

      return response;
    } catch (error) {
      console.error("Error Fetching Pending Orders", error);
      throw error;
    }
  }

  /**
   * Cancels an existing order from exchange
   * @async
   * @param {string} cl_ord_id - Client ID
   * @param {string} txid - Transactio ID
   * @returns {Promise<object>} - Status of Order cancellation
   * @see https://docs.kraken.com/api/docs/rest-api/cancel-order
   */

  static async cancelOrderFromExchange(cl_ord_id, txid) {
    try {
      const params = this.buildQueryParams({
        cl_ord_id: cl_ord_id, //can remove this if not needed..
        txid: txid, //this txtid is the transaction id..
      });

      const response = await this.callExchangeAPI(this.endPoints.Cancel_Order, params, "POST");

      if (this.isError(response)) {
        const errMsg = response.msg ?? JSON.stringify(response);
        return new CancelOrderResult(false, errMsg, response);
      }


      return new CancelOrderResult(true, "Success", response);
    } catch (error) {
      console.error("Error Cancelling An Order", error);
      throw error;
    }
  }

      /**
     * Fetches Order details from exchange
     * @async
     * @param {string} txid - Transactio ID
     * @returns {Promise<object>} - Order details
     * @see https://docs.kraken.com/api/docs/rest-api/get-orders-info
     */
  // 
  static async fetchOrderFromExchange(txid) {
    try {
      const params = this.buildQueryParams({
        txid: txid, //this is similar to order_id..
      });

      const response = await this.callExchangeAPI(this.endPoints.Fetch_Order, params, "POST");

      if (this.isError(response)) {
        const errMgs = response.msg ?? JSON.stringify(response);
        return FetchOrderResultFactory.createFalseResult(errMgs);
      }

      console.log("Success Response From API:", response);

      return this.createFetchOrderResultFromResponse(response);
    } catch (error) {
      console.error("Error Fetching Order Details", error);
      throw error;
    }
  }

  static createFetchOrderResultFromResponse(response) {
    const orderKey = Object.keys(response.result)[0];
    const order = response.result[orderKey];
    const status =
      order.status ?? this.STATE_MAP[order.status] ?? UserOrder.STATUS_ONGOING;
    const avg = parseFloat(order.cost) / parseFloat(order.vol_exec) || 0;
    const filled = parseFloat(order.vol_exec) || 0;
    const fee = parseFloat(order.fee) || 0;

    return FetchOrderResultFactory.createSuccessResult(
      status, // Order status
      avg * filled, // Total cost
      avg, // Average price
      fee, // Fee
      filled, // Filled quantity
      new Date(order.closetm * 1000).toISOString() // Close time
    );
  }

      /**
     * Fetches recent trades from exchange
     * @async
     * @returns {Promise<object>} - Order details
     * @see https://docs.kraken.com/api/docs/rest-api/get-trade-history
     */
  static async loadTradesForClosedOrder() {
    try {
      const response = await this.callExchangeAPI(this.endPoints.Trades, {}, "POST");

      if (this.isError(response)) {
        const errMgs = response.msg ?? JSON.stringify(response);
        return errMgs;
      }

      // console.log("Success Response From API:", response);

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
      } else if (trades && typeof trades === "object") {
        tradesArray = [trades];
      }

      // Default value if no trades
      if (
        !tradesArray[0]?.result ||
        !tradesArray[0]?.result?.trades ||
        Object.keys(tradesArray[0].result.trades).length === 0
      ) {
        return [
          {
            trade_id: "N/A",
            order: "N/A",
            amount: 0,
            baseQty: 0,
            fee: {
              currency: "N/A",
              cost: 0,
            },
            error: null,
          },
        ];
      }

      const ccxtTrades = Object.entries(tradesArray[0].result.trades).map(
        ([key, trade]) => {
          return {
            trade_id: key,
            order: trade.ordertxid || "N/A",
            amount: trade.price || 0,
            baseQty: trade.vol || 0, // Used 'vol' for quantity
            fee: {
              currency: "N/A", // No 'commissionAsset' in response
              cost: 0, // No 'commission' in response
            },
            error: trade.error || null,
          };
        }
      );

      return ccxtTrades;
    } catch (error) {
      console.warn("Error Fetching Order Details!", error.message);
      throw error;
    }
  }

    /**
     * Fetches market candle data from exchange
     * @async
     * @param {string} pair - Trading pair : BTCUSDT
     * @param {string} interval - time range : 1, 2, 3
     * @returns {Promise<object>} - List of market candles.
     * @see https://docs.kraken.com/api/docs/rest-api/get-ohlc-data
     */
  static async fetchKlines(pair,interval) {
    const url = "https://api.kraken.com/0/public/OHLC";

    try {
      const params = new URLSearchParams({
        pair: pair,
        interval: this.KRAK_INTERVALS[interval],
      });

      const fullUrl = `${url}?${params.toString()}`;

      const data = await fetch(fullUrl);
      const response = await data.json();

      // Checks if the response is valid
      if (!response.result || !Array.isArray(response.result.XBTUSDT)) {
        const errMsg = response.msg ?? JSON.stringify(response);
        return errMsg;
      }

      // Format the Klines data
      const formattedKlines = response.result.XBTUSDT.map((kline) => {
        return {
          time: kline[0],
          open: kline[1],
          high: kline[2],
          low: kline[3],
          close: kline[4],
          volume: kline[5],
        };
      });

      // Sort Klines by timestamp
      formattedKlines.sort((a, b) => a.time - b.time);

      return formattedKlines;
    } catch (error) {
      console.error("Error Fetching Klines", error);
      throw error;
    }
  }
}

export default Kraken;
