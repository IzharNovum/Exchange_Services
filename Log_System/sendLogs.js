import axios from "axios";
import { format } from 'date-fns';



async function sendLog(ExchangeService, Category, level, endPoint, message, ) {
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      const userName = "Izhar-Pasha";
      await axios.post('http://localhost:3001/log', {
        ExchangeService,
        timestamp,
        Category,
        level,
        userName,
        endPoint,
        message,
      });
      console.log('Log sent successfully');
    } catch (error) {
      console.error('Failed to send log:', error.message);
    }
  }



  export default sendLog;