"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class TblCompany extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  TblCompany.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      event_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "TblCompany",
      tableName: "tbl_companies",
      timestamps: true,
    },
  );
  return TblCompany;
};
