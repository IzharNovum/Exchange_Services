import { Sequelize } from "sequelize";

const { DB_NAME, PORT_NO, HOST, USER_NAME, PSSWORD, DIALECT } = process.env;


if (!DB_NAME || !PORT_NO || !HOST || !USER_NAME || !PSSWORD || !DIALECT) {
  throw new Error('Missing required environment variables');
}

const sequelize = new Sequelize(DB_NAME, USER_NAME, PSSWORD, {
  host: HOST,
  dialect: DIALECT,
  port: PORT_NO,
});
  


export default sequelize;


