import { Sequelize } from "sequelize";

const sequelize =  new Sequelize("development_db", "IzharPasha", "Izhar@Novum", { 
    host: "localhost",
    dialect: "mysql",
    port: 3306
});


export default sequelize;