'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class add - tbl - company extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  add - tbl - company.init({
    uuid: DataTypes.STRING,
    name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'add-tbl-company',
  });
  return add - tbl - company;
};