"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Lepas default value sementara pada kolom role
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_users" ALTER COLUMN "role" DROP DEFAULT;
    `);

    // 2. Ubah tipe kolom role sementara menjadi VARCHAR agar enum lama bisa dihapus
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_users" ALTER COLUMN "role" TYPE VARCHAR(50) USING "role"::text;
    `);

    // 3. Konversi data lama yang masih huruf kecil ('admin' -> 'ADMIN', 'user' -> 'USER')
    await queryInterface.sequelize.query(`
      UPDATE "tbl_users" SET "role" = UPPER("role") WHERE "role" IN ('admin', 'user', 'guest', 'superadmin');
    `);

    // 4. Hapus tipe enum lama dan buat ulang dengan daftar nilai yang bersih
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_tbl_users_role";
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_tbl_users_role" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER', 'GUEST');
    `);

    // 5. Kembalikan tipe kolom role ke enum_tbl_users_role dan pasang default 'GUEST'
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_users" 
      ALTER COLUMN "role" TYPE "enum_tbl_users_role" USING "role"::"enum_tbl_users_role";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_users" 
      ALTER COLUMN "role" SET DEFAULT 'GUEST'::"enum_tbl_users_role";
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "tbl_users" ALTER COLUMN "role" DROP DEFAULT;
      ALTER TABLE "tbl_users" ALTER COLUMN "role" TYPE VARCHAR(50) USING "role"::text;
      DROP TYPE IF EXISTS "enum_tbl_users_role";
      CREATE TYPE "enum_tbl_users_role" AS ENUM ('admin', 'user', 'GUEST');
      UPDATE "tbl_users" SET "role" = 'user' WHERE "role" NOT IN ('admin', 'user', 'GUEST');
      ALTER TABLE "tbl_users" ALTER COLUMN "role" TYPE "enum_tbl_users_role" USING "role"::"enum_tbl_users_role";
      ALTER TABLE "tbl_users" ALTER COLUMN "role" SET DEFAULT 'user'::"enum_tbl_users_role";
    `);
  },
};
