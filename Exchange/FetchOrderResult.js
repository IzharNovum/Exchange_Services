import { DateTime } from "luxon";
import UserOrder from "./Models/UserOrder.js";


/**
 * class FetchOrderResult immutable
 * @module - OkexExchange/Exchange/FetchOrderResult
 * 
 * This class is representing result when try to fetch order
 */

class FetchOrderResult{
    constructor(
        isSuccess,
        status,
        cost,
        average,
        fee,
        filled,
        time,
        note = "",
        executed = 0
      ) {
        if (typeof isSuccess === "boolean") {
          this.isSuccess = isSuccess;
          this.status = status;
          this.cost = cost;
          this.average = average;
          this.fee = fee;
          this.filled = filled;
          this.time = time ?? DateTime.now().toISO();
          this.note = note;
          this.failureMsg = null;
          this.executed = executed;
        } else {
          this.isSuccess = Boolean(isSuccess);
          this.status = String(status);
          this.cost = parseFloat(cost);
          this.average = parseFloat(average);
          this.fee = parseFloat(fee);
          this.filled = parseFloat(filled);
          this.time = time ?? DateTime.now().toISO();
          this.node = note;
          this.executed = 0;
        }
      }

      /**
       * @return {boolean}
       */
      isSuccess() {
        return this.isSuccess;
      }


      /**
       * @return {string}
       */

      getStatus(){
        return this.status;
      }

      /**
       * @return {number}
       */
      getCost(){
        return this.cost;
      }

      /**
       * @return {number}
       */
      getAverage(){
        return this.average;
      }

      /**
       * @return {number}
       */
      getFee(){
        return this.fee;
      }


      /**
       * @return {number}
       */
      getFilled(){
        return this.filled;
      }


      /**
       * @return {number}
       */
      isFilled(){
        return UserOrder.STATUS_FILLED_CCXT.includes(this.status);
      }

      /**
       * @return {DateTime}
       */
      getTime() { 
        return DateTime.fromISO(this.time);
      }


       /**
       * @return {string}
       */
      getFailureMsg(){
        return this.failureMsg;
      }

        /**
       * @return {string}
       */
      setFailureMsg(failureMsg){
        this.failureMsg = failureMsg;
      }

      toArray(){
        return ({
            success: this.isSuccess,
            status: this.status,
            cost: this.cost,
            average: this.average,
            fee: this.fee,
            filled: this.filled,
            time: this.time,
            timeMs: this.getTime().toMillis(),
            failureMsg: this.failureMsg,
            executed: this.executed,
        });
      }

      getNote(){
        return this.note;
      }

      setExecuted(executed){
        this.executed = executed;
      }

      getExecuted(){
        return this.executed;
      }

}

export default FetchOrderResult;