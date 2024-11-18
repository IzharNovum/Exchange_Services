import crypto from "crypto";
import PlaceOrderResultFactory from "../Order_Result/PlaceOrderResultFactory.js";
import UserOrder from "../Models/UserOrder.js";
import FetchOrderResultFactory from "../Order_Result/FetchOrderResultFactory.js";
import CancelOrderResult from "../Order_Result/CancelOrderResult.js";
import sendLogs from "../Log_System/sendLogs.js";
import OrderParam from "../Models/OrderParam.js";
import ExchangePair from "../Models/ExchangePair.js";

class BinanceService {

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

  static BAR_MAPS = {
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "2h": "2h",
    "4h": "4h",
    "6h": "6h",
    "1d": "1d",
  };

  static userName = process.env.USER_NAME;

  /**
   * Instance of the classes.
   */
  // static OrderParam = new OrderParam();
  // static ExchangePair = new ExchangePair();

  static getBaseUrl() {
    return "https://api.binance.com";
  }

  static buildQueryParams(params) {
    return params;
  }

  static endPoints = {
    Balance: "/api/v3/account",
    Place_Order: "/api/v3/order",
    Pending_Order: "/api/v3/openOrders",
    Cancel_Order: "/api/v3/order",
    Fetch_Order: "/api/v3/order",
    Trades: "/api/v3/myTrades",
    klines: "/api/v3/klines",
  };

  static isError(response) {
    return response.status !== 200 || !response;
  }

  /**
   * Authentication for this API.
   * @async
   * @param {string} endPoint - Url endpoint.
   * @param {string || number} params - Function parameters.
   * @param {string} method - HTTP Method
   * @returns {Promise<authData>} - Authentication Headers
   */
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

    if (endPoint !== "/api/v3/klines") {
      //ONLY ADDS THE TIMESTAMP AND SIGNATURE WHEN ITS NOT KLINES...
      params.timestamp = timestamp;
      queryString = Object.keys(params)
        .map(
          (key) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
        )
        .join("&");
      const signed = queryString;
      const raw_signature = crypto
        .createHmac("sha256", secret)
        .update(signed)
        .digest("hex");
      queryString += `&signature=${raw_signature}`;
      path = `${endPoint}?${queryString}`;
    } else {
      //REMOVES THE TIMESTAMP AND SIGNATURE FOR KLINES...
      queryString = Object.keys(params)
        .map(
          (key) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
        )
        .join("&");
      path = `${endPoint}?${queryString}`;
    }

    const fullUrl = `${baseUrl}${path}`;
    console.log("common exchange testing:", fullUrl)

    return {
      url: fullUrl,
      headers: {
        "X-MBX-APIKEY": apikey,
        accept: "application/json",
        "Content-Type":
          method === "POST" ? "application/x-www-form-urlencoded" : undefined,
      },
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
  static async callExchangeAPI(endPoint, params, method = "GET") {
    try {
      const { url, headers } = await this.Headers(endPoint, params, method);

      //LOGS AN ERROR IF ANY AUTH CREDENTIALS MISSING....
      if (!url || !headers) {
        await sendLogs.exchangeCritical.critical(
          "Missing Auth Data!",
          endPoint,
          this.userName
        );
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
      await sendLogs.exchangeError.error(
        `${error.message}`,
        endPoint,
        this.userName
      );
      console.error("Error CallExchangeAPI!", error);
      throw error;
    }
  }

  /**
   * Fetches User balance from exchange
   * @async
   * @returns {Promise<{coins: Array}>} - User Balance Details
   * @see https://developers.binance.com/docs/binance-spot-api-docs/rest-api#account-information-user_data
   */
  static async fetchBalanceOnExchange() {
    try {
      const response = await this.callExchangeAPI(this.endPoints.Balance, {});

      if (!response) {
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error(
          "No Response!",
          this.endPoints.Balance,
          this.userName
        );
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
      await sendLogs.exchangeInfo.info(
        "Successfully Fetched Balance!",
        this.endPoints.Balance,
        this.userName
      );
      return result;
    } catch (error) {
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(
        `${error.message}`,
        this.endPoints.Balance,
        this.userName
      );
      console.error("Error fetching balance:", error);
      throw error;
    }
  }

  /**
   * Places Order from exchange
   * @async
   * @param {string} symbol - Trading Pair : BTCUSDT
   * @param {string} side - BUY / SELL
   * @param {string} type - MARKET / LIMIT
   * @param {number} price - Price of the Order
   * @param {number} quantity - quantity of the order
   * @param {string} timeInForce - GTC
   * @returns {Promise<object>} - Details of placed Order.
   * @see https://developers.binance.com/docs/binance-spot-api-docs/rest-api#new-order-trade
   */

  static async placeOrderOnExchange(ExchangePair, OrderParam) {
    try {
      const params = this.buildQueryParams({
        symbol: ExchangePair.getSymbol(),
        side: OrderParam.getSide(),
        type: OrderParam.getType(),
        price: OrderParam.getPrice(),
        quantity: OrderParam.getQty(),
        // timeInForce: ExchangePair.getTimeinForce()
        timeInForce: "GTC"

      });

      console.log("PARAMETERS:", params)

      const response = await this.callExchangeAPI(
        this.endPoints.Place_Order,
        params,
        "POST"
      );

      if (this.isError(response)) {
        const msg =
          response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error(
          `${msg}`,
          this.endPoints.Place_Order,
          this.userName
        );
        return PlaceOrderResultFactory.createFalseResult(msg, response);
      }

      const msg = response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
      //SUCCESS LOG...
      await sendLogs.exchangeInfo.info(
        `${msg || "Order Placed!"}`,
        this.endPoints.Place_Order,
        this.userName
      );
      return await this.createSuccessPlaceOrderResult(response);
    } catch (error) {
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(
        `${error.message}`,
        this.endPoints.Place_Order,
        this.userName
      );
      console.warn("Error Placing An Order!", error.message);
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
      // WARN LOG...
      await sendLogs.exchangeWarn.warn(
        "Failed To Format The Response",
        endPoint,
        this.userName
      );
      console.error("Format Not Successed!", error.message);
    }
  }

  /**
   * Fetches Open Or Pending orders.
   * @async
   * @returns {Promise<Array>} List of open orders with order details.
   * @see https://developers.binance.com/docs/binance-spot-api-docs/rest-api#current-open-orders-user_data
   */

  static async pendingOrders() {
    try {
      const response = await this.callExchangeAPI(
        this.endPoints.Pending_Order,
        {}
      );

      if (this.isError(response)) {
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error(
          "No Response!",
          this.endPoints.Pending_Order,
          this.userName
        );
        console.warn("Response Is Not OK!", response);
      }
      //SUCCESS LOG...
      await sendLogs.exchangeInfo.info(
        "Successfully Fetched Pending Order!",
        this.endPoints.Pending_Order,
        this.userName
      );
      return response;
    } catch (error) {
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(
        `${error.message}`,
        this.endPoints.Pending_Order,
        this.userName
      );
      console.warn("Error Fetching Pending Orders!", error.message);
      throw new error();
    }
  }

  /**
   * Cancels an existing order from exchange.
   * @async
   * @param {number} symbol - Trading Pair : BTCUSDT
   * @param {number} orderId -  Order ID.
   * @returns {Promise<object>} - Status of order cancellation.
   * @see https://developers.binance.com/docs/binance-spot-api-docs/rest-api#cancel-order-trade
   */

  static async cancelOrderFromExchange(symbol, orderId) {
    try {
      const params = this.buildQueryParams({
        symbol: symbol,
        orderId: orderId,
      });

      const response = await this.callExchangeAPI(
        this.endPoints.Cancel_Order,
        params,
        "DELETE"
      );

      if (this.isError(response)) {
        const msg =
          response.data?.[0]?.sMsg ?? response.msg ?? JSON.stringify(response);
        //LOGS AN ERROR...
        await sendLogs.exchangeError.error(
          `${msg}`,
          this.endPoints.Cancel_Order,
          this.userName
        );
        return new CancelOrderResult(false, msg, response);
      }

      //SUCCESS LOG...
      await sendLogs.exchangeInfo.info(
        "Order Cancelled!",
        this.endPoints.Cancel_Order,
        this.userName
      );
      return new CancelOrderResult(true, "Success", response);
    } catch (error) {
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(
        `${error.message}`,
        this.endPoints.Cancel_Order,
        this.userName
      );
      console.warn("Error Cancelling An Order!", error.message);
      throw new error();
    }
  }

  /**
   * Fetches Order details from exchange.
   * @async
   * @param {number} symbol - Trading Pair : BTCUSDT
   * @param {number} orderId -  Order ID.
   * @returns {Promise<object>} -  Order Details.
   * @see   https://developers.binance.com/docs/binance-spot-api-docs/rest-api#query-order-user_data
   */
  static async fetchOrderFromExchange(symbol, orderId) {
    try {
      const params = this.buildQueryParams({
        symbol: symbol,
        orderId: orderId,
      });

      const response = await this.callExchangeAPI(
        this.endPoints.Fetch_Order,
        params
      );

      if (this.isError(response)) {
        const failureMsg =
          response?.sMsg ??
          response.msg ??
          "Unexpected response format or missing critical fields.";
        // LOGS AN ERROR...
        await sendLogs.exchangeError.error(
          `${failureMsg}`,
          this.endPoints.Fetch_Order,
          this.userName
        );
        return FetchOrderResultFactory.createFalseResult(failureMsg);
      }

      //SUCCESS LOG...
      await sendLogs.exchangeInfo.info(
        "Order Fetch Successfull!",
        this.endPoints.Fetch_Order,
        this.userName
      );
      return this.createFetchOrderResultFromResponse(response);
    } catch (error) {
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(
        `${error.message}`,
        this.endPoints.Fetch_Order,
        this.userName
      );
      console.warn("Error Fetching Order Details!", error.message);
      throw new error();
    }
  }

  static createFetchOrderResultFromResponse(response) {
    const status = this.STATE_MAP[response.status] ?? UserOrder.STATUS_ONGOING;
    const avg =
      parseFloat(response.cummulativeQuoteQty) /
        parseFloat(response.executedQty) || 0;
    const filled = parseFloat(response.executedQty) || 0;

    return FetchOrderResultFactory.createSuccessResult(
      status, //order status
      avg * filled, // Total cost
      avg, // Average price
      0, // No Fee Avail In res
      filled, // Filled quantity
      new Date(response.time).toISOString() // Time
    );
  }

  /**
   * Fetches my recent trades.
   * @async
   * @param {number} symbol - Trading Pair : BTCUSDT
   * @returns {Promise<object>} - List of recent trades.
   * @see https://developers.binance.com/docs/binance-spot-api-docs/rest-api#account-trade-list-user_data
   */
  static async loadTradesForClosedOrder(symbol) {
    try {
      const params = this.buildQueryParams({
        symbol: symbol,
      });

      const response = await this.callExchangeAPI(
        this.endPoints.Trades,
        params
      );

      if (this.isError(response)) {
        console.error(
          "Error message from response:",
          response.msg || "Unknown error"
        );
      }

      //SUCCESS LOG...
      await sendLogs.exchangeInfo.info(
        "Operation Succesfull!",
        this.endPoints.Trades,
        this.userName
      );
      return this.convertTradesToCcxtFormat(response ?? {});
    } catch (error) {
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(
        `${error.message}`,
        this.endPoints.Trades,
        this.userName
      );
      console.error("Error Fetching Trades", error);
      throw new error();
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

      const ccxtTrades = tradesArray.map((trade) => ({
        order: trade.orderId || "N/A",
        amount: trade.price || 0,
        baseQty: trade.qty || 0,
        fee: {
          currency: trade.commissionAsset || "N/A",
          cost: Math.abs(trade.commission) || 0,
        },
        error: trade.error || null,
      }));

      return ccxtTrades;
    } catch (error) {
      // WARN LOG...
      await sendLogs.exchangeWarn.warn(
        "Failed To Format The Response",
        endPoint,
        this.userName
      );
      console.warn("Error Fetching Order Details!", error.message);
      throw new error();
    }
  }


  /**
   * Fetches market candles from exchange
   * @async
   * @param {string} symbol - Trading Pair : BTCUSDT
   * @param {string} interval - Time Range In sec: 1s
   * @returns {Promise <Array>} List of candles data.
   * @see https://developers.binance.com/docs/binance-spot-api-docs/rest-api#klinecandlestick-data
   */

  static async fetchKlines(symbol, interval) {
    try {
      const params = {
        symbol: symbol,
        interval: this.BAR_MAPS[interval],
      };

      const response = await this.callExchangeAPI(
        this.endPoints.klines,
        params
      );

      //LOGS AN ERROR...
      if (Array.isArray(response.data) && response.data.length === 0) {
        await sendLogs.exchangeError.error(
          "No Klines data found",
          this.endPoints.klines,
          this.userName
        );
        return; // Exit early if there is no data
      }

      let klines = response.map((kline) => [
        kline[0], // time
        kline[1], // open
        kline[2], // high
        kline[3], // low
        kline[4], // close
        0, // no-volume
      ]);

      klines.sort((a, b) => a[0] - b[0]); //Sorted By timestamp

      //SUCCESS LOG...
      await sendLogs.exchangeInfo.info(
        "Operation Succesfull!",
        this.endPoints.klines,
        this.userName
      );
      return klines;
    } catch (error) {
      //LOGS AN ERROR...
      await sendLogs.exchangeError.error(
        `${error.message}`,
        this.endPoints.klines,
        this.userName
      );
      console.warn("Error Fetching Klines!", error);
      throw  error;
    }
  }
}

export default BinanceService;
