-- 慢夏闲置衣服回收平台 数据库脚本
-- MySQL 8.0+
-- 使用方式: mysql -u root -p < database/schema.sql
drop database if exists manxia;
CREATE DATABASE IF NOT EXISTS manxia DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE manxia;

-- --------------------------------------------------------
-- 管理员表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(64)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role        ENUM('super','admin','staff') NOT NULL DEFAULT 'admin',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 用户表（微信小程序用户）
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    openid      VARCHAR(128) NOT NULL UNIQUE COMMENT '微信 openid',
    nickname    VARCHAR(64)  NOT NULL DEFAULT '用户',
    avatar_url  VARCHAR(512) DEFAULT NULL,
    phone       VARCHAR(20)  DEFAULT NULL,
    points      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '积分余额',
    total_recycled_kg DECIMAL(8,2) NOT NULL DEFAULT 0.00 COMMENT '累计回收公斤数',
    status      TINYINT NOT NULL DEFAULT 1 COMMENT '0=禁用 1=正常',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 用户地址表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS addresses (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED NOT NULL,
    contact_name VARCHAR(64)  NOT NULL,
    phone        VARCHAR(20)  NOT NULL,
    province     VARCHAR(32)  NOT NULL,
    city         VARCHAR(32)  NOT NULL,
    district     VARCHAR(32)  NOT NULL DEFAULT '',
    detail       VARCHAR(255) NOT NULL,
    is_default   TINYINT NOT NULL DEFAULT 0,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 回收员表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS recyclers (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL,
    phone       VARCHAR(20)  NOT NULL UNIQUE,
    id_card     VARCHAR(20)  DEFAULT NULL COMMENT '身份证号',
    area        VARCHAR(128) NOT NULL DEFAULT '' COMMENT '负责区域',
    status      TINYINT NOT NULL DEFAULT 1 COMMENT '0=禁用 1=空闲 2=忙碌',
    rating      DECIMAL(2,1) NOT NULL DEFAULT 5.0 COMMENT '评分 1-5',
    order_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '完成订单数',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 订单主表
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_no         VARCHAR(32)  NOT NULL UNIQUE COMMENT '订单编号',
    user_id          INT UNSIGNED NOT NULL,
    recycler_id      INT UNSIGNED DEFAULT NULL,
    address_id       INT UNSIGNED DEFAULT NULL,
    -- 冗余地址字段（防止地址被删除后订单信息丢失）
    addr_contact     VARCHAR(64)  DEFAULT NULL,
    addr_phone       VARCHAR(20)  DEFAULT NULL,
    addr_full        VARCHAR(512) DEFAULT NULL,
    scheduled_time   DATETIME     NOT NULL COMMENT '预约上门时间',
    estimated_weight TINYINT NOT NULL DEFAULT 0 COMMENT '0=不确定 1=5-20kg 2=20-50kg 3=50kg以上',
    actual_weight    DECIMAL(8,2) DEFAULT NULL COMMENT '实际重量(kg)',
    unit_price       DECIMAL(5,2) NOT NULL DEFAULT 0.80 COMMENT '单价(元/kg)',
    final_amount     DECIMAL(8,2) DEFAULT NULL COMMENT '最终结算金额',
    status           TINYINT NOT NULL DEFAULT 0
                     COMMENT '0=待接单 1=已接单 2=回收中 3=已完成 4=已取消',
    notes            VARCHAR(512) DEFAULT NULL,
    cancel_reason    VARCHAR(255) DEFAULT NULL,
    proof_images     TEXT         DEFAULT NULL COMMENT '回收员上传凭证图片(JSON数组)',
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_recycler (recycler_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    CONSTRAINT fk_order_user     FOREIGN KEY (user_id)     REFERENCES users(id),
    CONSTRAINT fk_order_recycler FOREIGN KEY (recycler_id) REFERENCES recyclers(id) ON DELETE SET NULL,
    CONSTRAINT fk_order_address  FOREIGN KEY (address_id)  REFERENCES addresses(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 订单衣物分类明细
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_categories (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id    INT UNSIGNED NOT NULL,
    category    ENUM('clothes','shoes','bedding','plush','other') NOT NULL COMMENT '衣服/鞋包/床品/毛绒/其他',
    qty         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    INDEX idx_order (order_id),
    CONSTRAINT fk_cat_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 积分流水
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS points_records (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED NOT NULL,
    order_id     INT UNSIGNED DEFAULT NULL,
    change_type  ENUM('earn','redeem','adjust') NOT NULL COMMENT '获得/兑换/调整',
    amount       INT NOT NULL COMMENT '变动积分(负数为扣减)',
    balance_after INT UNSIGNED NOT NULL COMMENT '变动后余额',
    note         VARCHAR(255) DEFAULT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_order (order_id),
    CONSTRAINT fk_pts_user  FOREIGN KEY (user_id)  REFERENCES users(id),
    CONSTRAINT fk_pts_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- --------------------------------------------------------
-- 种子数据
-- --------------------------------------------------------

-- 默认管理员账号 admin / manxia2024
-- 默认密码: manxia2024
INSERT INTO admins (username, password_hash, role) VALUES
('admin', '$2b$12$I8U.CjytAM4prbVtmhNJS.cjSYZ/MOKA8hqAki4y9zTN3IPkcvkdy', 'super');

-- 测试用户
INSERT INTO users (openid, nickname, avatar_url, phone, points, total_recycled_kg) VALUES
('wx_test_001', '张小明', 'https://api.dicebear.com/7.x/avataaars/svg?seed=1', '13800001111', 120, 15.50),
('wx_test_002', '李华',   'https://api.dicebear.com/7.x/avataaars/svg?seed=2', '13800002222', 80,  8.00),
('wx_test_003', '王芳',   'https://api.dicebear.com/7.x/avataaars/svg?seed=3', '13800003333', 200, 25.00);

-- 测试回收员
INSERT INTO recyclers (name, phone, id_card, area, status, rating, order_count) VALUES
('陈师傅', '13900001111', '310101199001011234', '上海市浦东新区', 1, 4.9, 128),
('王师傅', '13900002222', '310101199002021234', '上海市静安区',   1, 4.8, 96),
('刘师傅', '13900003333', '310101199003031234', '上海市虹口区',   2, 4.7, 74);

-- 测试地址
INSERT INTO addresses (user_id, contact_name, phone, province, city, district, detail, is_default) VALUES
(1, '张小明', '13800001111', '上海市', '上海市', '浦东新区', '陆家嘴金融中心1号楼302室', 1),
(2, '李华',   '13800002222', '上海市', '上海市', '静安区',   '南京西路888号', 1);

-- 测试订单
INSERT INTO orders
    (order_no, user_id, recycler_id, address_id, addr_contact, addr_phone, addr_full,
     scheduled_time, estimated_weight, actual_weight, unit_price, final_amount, status, notes)
VALUES
('MX20240401001', 1, 1, 1, '张小明', '13800001111', '上海市浦东新区陆家嘴金融中心1号楼302室',
 '2024-04-02 09:00:00', 2, 22.50, 0.80, 18.00, 3, '方便的话带打包袋'),
('MX20240401002', 2, NULL, 2, '李华', '13800002222', '上海市静安区南京西路888号',
 '2024-04-05 14:00:00', 1, NULL, 0.80, NULL, 0, NULL),
('MX20240402001', 1, 2, 1, '张小明', '13800001111', '上海市浦东新区陆家嘴金融中心1号楼302室',
 '2024-04-06 10:00:00', 1, NULL, 0.80, NULL, 1, '尽早联系');

-- 订单衣物分类
INSERT INTO order_categories (order_id, category, qty) VALUES
(1, 'clothes', 15), (1, 'bedding', 3),
(2, 'clothes', 8),  (2, 'shoes', 2),
(3, 'clothes', 10), (3, 'plush', 4);

-- 积分记录
INSERT INTO points_records (user_id, order_id, change_type, amount, balance_after, note) VALUES
(1, 1, 'earn', 180, 180, '订单MX20240401001完成奖励'),
(1, NULL, 'earn', 20, 200, '注册奖励'),
(1, NULL, 'redeem', -80, 120, '积分兑换现金券');

-- ─── 升级迁移（已有数据库执行此段） ────────────────────────────────────────────
-- 如果已有旧版数据库，执行以下语句添加新字段（新建数据库从头执行 schema.sql 无需此段）
-- ALTER TABLE orders ADD COLUMN proof_images TEXT DEFAULT NULL COMMENT '回收员上传凭证图片(JSON数组)';
