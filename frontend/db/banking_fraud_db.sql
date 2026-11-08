-- BANKING FRAUD DETECTION 

DROP DATABASE IF EXISTS banking_fraud_db;

CREATE DATABASE banking_fraud_db;

USE banking_fraud_db;

SET FOREIGN_KEY_CHECKS = 0;

-- TABLE 1: CUSTOMERS 
DROP TABLE IF EXISTS Customers;

CREATE TABLE Customers (
    customer_id BIGINT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone_number VARCHAR(30) NOT NULL,
    country VARCHAR(60) NOT NULL,
    nationality VARCHAR(60) NOT NULL,
    preferred_currency VARCHAR(3) NOT NULL,
    customer_status ENUM(
        'Active Status',
        'Pending Status',
        'Pending Verification Status',
        'Suspended Status',
        'Frozen Status',
        'Locked Status',
        'Closed Status',
        'Inactive Status',
        'Dormant Status',
        'Restricted Status',
        'Terminated Status',
        'Archived Status',
        'Under Review Status'
    ) NOT NULL DEFAULT 'Active Status',
    registration_date DATE NOT NULL
);

INSERT INTO Customers
(
    customer_id,
    customer_name,
    email,
    phone_number,
    country,
    nationality,
    preferred_currency,
    customer_status,
    registration_date
)
VALUES
(84920115, 'Aarav Sharma', 'aarav.sharma@email.com', '+91-9876543210', 'India', 'Indian', 'INR', 'Active Status', '2023-02-14'),
(91823049, 'Emily Carter', 'emily.carter@email.com', '+1-202-555-0147', 'United States', 'American', 'USD', 'Active Status', '2022-07-21'),
(67291043, 'Oliver Brown', 'oliver.brown@email.com', '+44-7700-900123', 'United Kingdom', 'British', 'GBP', 'Under Review Status', '2024-01-18'),
(30482194, 'Rohan Mehta', 'rohan.mehta@email.com', '+91-9123456780', 'India', 'Indian', 'INR', 'Active Status', '2021-11-09'),
(51028374, 'Sophia Wilson', 'sophia.wilson@email.com', '+1-917-555-0182', 'United States', 'American', 'USD', 'Active Status', '2023-06-30'),
(62839104, 'Liam Anderson', 'liam.anderson@email.com', '+1-416-555-0198', 'Canada', 'Canadian', 'CAD', 'Under Review Status', '2024-02-11'),
(73192048, 'Fatima Hassan', 'fatima.hassan@email.com', '+971-50-555-0123', 'United Arab Emirates', 'Emirati', 'AED', 'Active Status', '2022-09-16'),
(48201937, 'Lucas Martin', 'lucas.martin@email.com', '+33-6-12-34-56-78', 'France', 'French', 'EUR', 'Active Status', '2023-03-25'),
(59381720, 'Charlotte Smith', 'charlotte.smith@email.com', '+61-412-345-678', 'Australia', 'Australian', 'AUD', 'Active Status', '2021-08-19'),
(68429103, 'Yuki Tanaka', 'yuki.tanaka@email.com', '+81-90-1234-5678', 'Japan', 'Japanese', 'JPY', 'Active Status', '2020-05-12'),
(11928374, 'Mateo Rossi', 'mateo.rossi@email.com', '+39-06-69812345', 'Italy', 'Italian', 'EUR', 'Active Status', '2022-01-15'),
(22938475, 'Freja Lindqvist', 'freja.lindqvist@email.com', '+46-8-123-4567', 'Sweden', 'Swedish', 'EUR', 'Active Status', '2023-04-19'),
(33948576, 'Carlos Silva', 'carlos.silva@email.com', '+55-11-98765-4321', 'Brazil', 'Brazilian', 'USD', 'Under Review Status', '2024-03-10'),
(44958677, 'Ananya Iyer', 'ananya.iyer@email.com', '+91-9823456789', 'India', 'Indian', 'INR', 'Active Status', '2022-10-05'),
(55968778, 'Lukas Weber', 'lukas.weber@email.com', '+49-30-1234567', 'Germany', 'German', 'EUR', 'Active Status', '2021-12-01'),
(66978879, 'Chloe Dubois', 'chloe.dubois@email.com', '+33-1-42685555', 'France', 'French', 'EUR', 'Active Status', '2023-08-22'),
(77988980, 'Tariq Al-Mansoor', 'tariq.mansoor@email.com', '+966-11-234-5678', 'Saudi Arabia', 'Saudi', 'USD', 'Active Status', '2022-04-14'),
(88999081, 'Elena Rostova', 'elena.rostova@email.com', '+420-2-1234-5678', 'Czech Republic', 'Czech', 'EUR', 'Frozen Status', '2023-11-30'),
(99000182, 'Wei Chen', 'wei.chen@email.com', '+65-6789-0123', 'Singapore', 'Singaporean', 'USD', 'Active Status', '2021-05-18'),
(10111283, 'Kavita Nair', 'kavita.nair@email.com', '+91-9745123456', 'India', 'Indian', 'INR', 'Active Status', '2023-09-09'),
(11222384, 'Jack Miller', 'jack.miller@email.com', '+61-2-9876-5432', 'Australia', 'Australian', 'AUD', 'Active Status', '2022-06-12'),
(12333485, 'Dmitri Volkov', 'dmitri.volkov@email.com', '+48-22-123-4567', 'Poland', 'Polish', 'EUR', 'Under Review Status', '2024-05-02'),
(13444586, 'Amara Okafor', 'amara.okafor@email.com', '+234-803-123-4567', 'Nigeria', 'Nigerian', 'USD', 'Suspended Status', '2023-07-07'),
(14555687, 'Min-jun Kim', 'minjun.kim@email.com', '+82-2-555-0199', 'South Korea', 'South Korean', 'USD', 'Active Status', '2021-03-29'),
(15666788, 'Santiago Morales', 'santiago.morales@email.com', '+52-55-5555-1234', 'Mexico', 'Mexican', 'USD', 'Active Status', '2022-11-17'),
(16777889, 'Nora Hansen', 'nora.hansen@email.com', '+47-22-33-44-55', 'Norway', 'Norwegian', 'EUR', 'Active Status', '2023-12-04'),
(17888990, 'Arjun Patel', 'arjun.patel@email.com', '+91-9988776655', 'India', 'Indian', 'INR', 'Active Status', '2020-09-23'),
(18999091, 'Zoe Jenkins', 'zoe.jenkins@email.com', '+44-20-7946-0912', 'United Kingdom', 'British', 'GBP', 'Active Status', '2022-08-08'),
(19100192, 'Hassan Farooq', 'hassan.farooq@email.com', '+92-21-35550123', 'Pakistan', 'Pakistani', 'USD', 'Restricted Status', '2024-04-15'),
(20211293, 'Isabella Gomez', 'isabella.gomez@email.com', '+34-91-123-4567', 'Spain', 'Spanish', 'EUR', 'Active Status', '2023-05-20'),
(21322394, 'Vikram Singhania', 'vikram.singhania@email.com', '+91-9811223344', 'India', 'Indian', 'INR', 'Active Status', '2021-02-17'),
(22433495, 'Grace Hopper', 'grace.hopper@email.com', '+1-312-555-0177', 'United States', 'American', 'USD', 'Active Status', '2022-12-11'),
(23544596, 'Kenji Sato', 'kenji.sato@email.com', '+81-3-3555-0143', 'Japan', 'Japanese', 'JPY', 'Active Status', '2020-10-30'),
(24655697, 'Maya Lin', 'maya.lin@email.com', '+1-604-555-0188', 'Canada', 'Canadian', 'CAD', 'Active Status', '2023-01-25'),
(25766798, 'Arthur Pendelton', 'arthur.pendelton@email.com', '+44-161-496-0123', 'United Kingdom', 'British', 'GBP', 'Locked Status', '2024-06-01'),
(26877899, 'Layla Mahmoud', 'layla.mahmoud@email.com', '+20-2-3555-0165', 'Egypt', 'Egyptian', 'USD', 'Active Status', '2022-03-14'),
(27988900, 'Finnian O-Connor', 'finnian.oconnor@email.com', '+353-1-496-0124', 'Ireland', 'Irish', 'EUR', 'Active Status', '2021-07-04'),
(28099001, 'Siddharth Sen', 'siddharth.sen@email.com', '+91-9711002233', 'India', 'Indian', 'INR', 'Active Status', '2023-10-18'),
(29110102, 'Hannah Abbott', 'hannah.abbott@email.com', '+1-415-555-0132', 'United States', 'American', 'USD', 'Active Status', '2022-05-09'),
(30221203, 'Gabriel Santos', 'gabriel.santos@email.com', '+351-21-355-0123', 'Portugal', 'Portuguese', 'EUR', 'Active Status', '2023-03-03'),
(31332304, 'Olga Ivanova', 'olga.ivanova@email.com', '+380-44-123-4567', 'Ukraine', 'Ukrainian', 'EUR', 'Under Review Status', '2024-01-05'),
(32443405, 'Deepak Verma', 'deepak.verma@email.com', '+91-9877665544', 'India', 'Indian', 'INR', 'Active Status', '2020-08-12'),
(33554506, 'Mia Van Der Beek', 'mia.vanderbeek@email.com', '+31-20-555-0145', 'Netherlands', 'Dutch', 'EUR', 'Active Status', '2021-09-27'),
(34665607, 'Noor Al-Fassi', 'noor.alfassi@email.com', '+974-4455-0123', 'Qatar', 'Qatari', 'USD', 'Active Status', '2022-08-15'),
(35776708, 'Ethan Hunt', 'ethan.hunt@email.com', '+1-206-555-0164', 'United States', 'American', 'USD', 'Dormant Status', '2021-01-10'),
(36887809, 'Priya Das', 'priya.das@email.com', '+91-9433221100', 'India', 'Indian', 'INR', 'Active Status', '2023-11-12'),
(37998910, 'Lars Mikkelsen', 'lars.mikkelsen@email.com', '+45-35-55-01-23', 'Denmark', 'Danish', 'EUR', 'Active Status', '2022-02-28'),
(38109011, 'Mei-Ling Zhou', 'meiling.zhou@email.com', '+852-2555-0187', 'Hong Kong', 'Chinese', 'USD', 'Active Status', '2020-12-05'),
(39210112, 'Rashid Khan', 'rashid.khan@email.com', '+93-20-255-0123', 'Afghanistan', 'Afghan', 'USD', 'Terminated Status', '2024-05-20'),
(40321213, 'Zara Phillips', 'zara.phillips@email.com', '+64-9-555-0134', 'New Zealand', 'New Zealander', 'AUD', 'Active Status', '2023-04-01');


-- TABLE 2: ACCOUNTS 
DROP TABLE IF EXISTS Accounts;

CREATE TABLE Accounts (
    account_id BIGINT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    account_number BIGINT NOT NULL UNIQUE,
    account_type ENUM(
        'Individual Account',
        'Personal Account',
        'Corporate Account',
        'Business Account',
        'Joint Account',
        'Savings Account',
        'Checking Account',
        'Current Account',
        'Merchant Account',
        'Admin Account',
        'System Account',
        'Trust Account',
        'Custodial Account',
        'Escrow Account',
        'Investment Account',
        'Brokerage Account',
        'Retirement Account',
        'Loan Account',
        'Credit Card Account'
    ) NOT NULL,
    balance DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status ENUM(
        'Active Status',
        'Pending Status',
        'Pending Verification Status',
        'Suspended Status',
        'Frozen Status',
        'Locked Status',
        'Closed Status',
        'Inactive Status',
        'Dormant Status',
        'Restricted Status',
        'Terminated Status',
        'Archived Status',
        'Under Review Status'
    ) NOT NULL,
    ifsc_code VARCHAR(20),
    FOREIGN KEY (customer_id)
        REFERENCES Customers(customer_id)
        ON DELETE CASCADE
);

INSERT INTO Accounts
(
    account_id,
    customer_id,
    account_number,
    account_type,
    balance,
    currency,
    status,
    ifsc_code
)
VALUES
(4019283741, 84920115, 1002345678, 'Savings Account', 245680.50, 'INR', 'Active Status', 'HDFC0001234'),
(7821039482, 91823049, 1004567891, 'Personal Account', 186520.75, 'USD', 'Active Status', 'CHASE000456'),
(8192039481, 67291043, 1007891234, 'Individual Account', 35000.00, 'GBP', 'Frozen Status', 'HSBC0005678'),
(2938401928, 30482194, 1006789123, 'Current Account', 1523000.00, 'INR', 'Active Status', 'UTIB0008901'),
(5109283746, 51028374, 1008912345, 'Checking Account', 78500.20, 'USD', 'Active Status', 'CHASE000101'),
(6283749201, 62839104, 1009123456, 'Joint Account', 125400.80, 'CAD', 'Under Review Status', 'RBC000202'),
(7318294012, 73192048, 1010234567, 'Business Account', 450000.00, 'AED', 'Active Status', 'ENBD000303'),
(4829301746, 48201937, 1011345678, 'Personal Account', 28900.45, 'EUR', 'Active Status', 'BNPA000404'),
(5938201746, 59381720, 1012456789, 'Investment Account', 875000.00, 'AUD', 'Active Status', 'ANZ000505'),
(6849201837, 68429103, 1013567890, 'Retirement Account', 12500000.00, 'JPY', 'Active Status', 'MUFG000606'),
(1192837401, 11928374, 1014678901, 'Current Account', 41200.00, 'EUR', 'Active Status', 'UNIC000707'),
(2293847502, 22938475, 1015789012, 'Savings Account', 98000.00, 'EUR', 'Active Status', 'SEBA000808'),
(3394857603, 33948576, 1016890123, 'Personal Account', 14500.50, 'USD', 'Under Review Status', 'ITAU000909'),
(4495867704, 44958677, 1017901234, 'Savings Account', 680200.00, 'INR', 'Active Status', 'SBIN0001122'),
(5596877805, 55968778, 1018012345, 'Business Account', 320000.00, 'EUR', 'Active Status', 'DBNK0003344'),
(6697887906, 66978879, 1019123456, 'Checking Account', 52300.75, 'EUR', 'Active Status', 'SGAS0005566'),
(7798898007, 77988980, 1020234567, 'Corporate Account', 2400000.00, 'USD', 'Active Status', 'NCBI0007788'),
(8899908108, 88999081, 1021345678, 'Individual Account', 8400.00, 'EUR', 'Frozen Status', 'CSAS0009900'),
(9900018209, 99000182, 1022456789, 'Merchant Account', 1900000.00, 'USD', 'Active Status', 'DBSB0001212'),
(1011128310, 10111283, 1023567890, 'Savings Account', 345000.00, 'INR', 'Active Status', 'ICIC0003434'),
(1122238411, 11222384, 1024678901, 'Personal Account', 63500.00, 'AUD', 'Active Status', 'NABK0005656'),
(1233348512, 12333485, 1025789012, 'Joint Account', 18200.00, 'EUR', 'Under Review Status', 'PKOB0007878'),
(1344458613, 13444586, 1026890123, 'Checking Account', 4100.00, 'USD', 'Suspended Status', 'FBNK0009090'),
(1455568714, 14555687, 1027901234, 'Savings Account', 89000.00, 'USD', 'Active Status', 'SHIN0002323'),
(1566678815, 15666788, 1028012345, 'Business Account', 560000.00, 'USD', 'Active Status', 'BBVA0004545'),
(1677788916, 16777889, 1029123456, 'Personal Account', 112000.00, 'EUR', 'Active Status', 'DNBK0006767'),
(1788899017, 17888990, 1030234567, 'Current Account', 4200000.00, 'INR', 'Active Status', 'KKBK0008989'),
(1899909118, 18999091, 1031345678, 'Checking Account', 47200.00, 'GBP', 'Active Status', 'BARC0001313'),
(1910019219, 19100192, 1032456789, 'Individual Account', 6500.00, 'USD', 'Restricted Status', 'HBLA0003535'),
(2021129320, 20211293, 1033567890, 'Personal Account', 38900.00, 'EUR', 'Active Status', 'SANB0005757'),
(2132239421, 21322394, 1034678901, 'Corporate Account', 8900000.00, 'INR', 'Active Status', 'PUNB0007979'),
(2243349522, 22433495, 1035789012, 'Investment Account', 1250000.00, 'USD', 'Active Status', 'BOFA0009191'),
(2354459623, 23544596, 1036890123, 'Savings Account', 9200000.00, 'JPY', 'Active Status', 'SMBC0001414'),
(2465569724, 24655697, 1037901234, 'Checking Account', 34100.00, 'CAD', 'Active Status', 'TDUS0003636'),
(2576679825, 25766798, 1038012345, 'Individual Account', 1200.00, 'GBP', 'Locked Status', 'NWES0005858'),
(2687789926, 26877899, 1039123456, 'Personal Account', 29000.00, 'USD', 'Active Status', 'NBEG0007070'),
(2798890027, 27988900, 1040234567, 'Savings Account', 76000.00, 'EUR', 'Active Status', 'BOFI0009292'),
(2809900128, 28099001, 1041345678, 'Current Account', 890000.00, 'INR', 'Active Status', 'YESB0001515'),
(2911010229, 29110102, 1042456789, 'Checking Account', 95000.00, 'USD', 'Active Status', 'WFC0003737'),
(3022120330, 30221203, 1043567890, 'Personal Account', 41500.00, 'EUR', 'Active Status', 'CGD0005959'),
(3133230431, 31332304, 1044678901, 'Joint Account', 16700.00, 'EUR', 'Under Review Status', 'PRIV0007171'),
(3244340532, 32443405, 1045789012, 'Savings Account', 510000.00, 'INR', 'Active Status', 'BARB0009393'),
(3355450633, 33554506, 1046890123, 'Business Account', 410000.00, 'EUR', 'Active Status', 'INGB0001616'),
(3466560734, 34665607, 1047901234, 'Corporate Account', 3100000.00, 'USD', 'Active Status', 'QNBK0003838'),
(3577670835, 35776708, 1048012345, 'Individual Account', 500.00, 'USD', 'Dormant Status', 'CITI0005050'),
(3688780936, 36887809, 1049123456, 'Savings Account', 180000.00, 'INR', 'Active Status', 'IOBA0007272'),
(3799891037, 37998910, 1050234567, 'Personal Account', 68000.00, 'EUR', 'Active Status', 'DANS0009494'),
(3810901138, 38109011, 1051345678, 'Merchant Account', 7500000.00, 'USD', 'Active Status', 'HSBC0001717'),
(3921011239, 39210112, 1052456789, 'Checking Account', 120.00, 'USD', 'Terminated Status', 'AIBK0003939'),
(4032121340, 40321213, 1053567890, 'Retirement Account', 430000.00, 'AUD', 'Active Status', 'ASBB0005151');



-- TABLE 3: TRANSACTIONS 
DROP TABLE IF EXISTS Transactions;

CREATE TABLE Transactions (
    transaction_ref VARCHAR(20) PRIMARY KEY,
    sender_account_id BIGINT NOT NULL,
    receiver_account_id BIGINT NOT NULL,
    transaction_type ENUM(
        'Deposit Transaction',
        'Credit Transaction',
        'Withdrawal Transaction',
        'Debit Transaction',
        'Transfer Transaction',
        'Internal Transfer Transaction',
        'External Transfer Transaction',
        'Payment Transaction',
        'Refund Transaction',
        'Chargeback Transaction',
        'Reversal Transaction',
        'Fee Transaction',
        'Interest Credit Transaction',
        'Tax Deduction Transaction',
        'Adjustment Transaction',
        'Void Transaction',
        'Authorized Transaction',
        'Settled Transaction',
        'Declined Transaction',
        'Disputed Transaction'
    ) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    sender_location VARCHAR(100),
    sender_latitude DECIMAL(10,6),
    sender_longitude DECIMAL(10,6),
    status ENUM(
        'Success',
        'Pending',
        'Failed',
        'Flagged',
        'Blocked',
        'Reversed'
    ) NOT NULL,
    created_at DATETIME NOT NULL,

    FOREIGN KEY (sender_account_id)
        REFERENCES Accounts(account_id),

    FOREIGN KEY (receiver_account_id)
        REFERENCES Accounts(account_id)
);

INSERT INTO Transactions
(
    transaction_ref,
    sender_account_id,
    receiver_account_id,
    transaction_type,
    amount,
    currency,
    sender_location,
    sender_latitude,
    sender_longitude,
    status,
    created_at
)
VALUES
('UTR260801000001', 4019283741, 7821039482, 'Transfer Transaction', 18500.00, 'INR', 'Pune, India', 18.520430, 73.856743, 'Success', '2026-08-01 09:42:15'),
('UTR260801000002', 7821039482, 2938401928, 'Deposit Transaction', 5000.00, 'USD', 'New York, USA', 40.712776, -74.005974, 'Success', '2026-08-01 14:18:37'),
('UTR260801000003', 8192039481, 2938401928, 'External Transfer Transaction', 4250.00, 'GBP', 'London, UK', 51.507351, -0.127758, 'Flagged', '2026-08-02 22:56:49'),
('UTR260801000004', 2938401928, 4019283741, 'Withdrawal Transaction', 12000.00, 'INR', 'Bengaluru, India', 12.971599, 77.594566, 'Pending', '2026-08-03 11:07:58'),
('UTR260801000005', 5109283746, 6283749201, 'Payment Transaction', 850.00, 'USD', 'New York, USA', 40.712776, -74.005974, 'Success', '2026-08-03 13:22:11'),
('UTR260801000006', 6283749201, 7318294012, 'External Transfer Transaction', 15000.00, 'CAD', 'Toronto, Canada', 43.653225, -79.383186, 'Flagged', '2026-08-04 02:14:32'),
('UTR260801000007', 7318294012, 4829301746, 'Payment Transaction', 27500.00, 'AED', 'Dubai, UAE', 25.204849, 55.270782, 'Success', '2026-08-04 10:32:45'),
('UTR260801000008', 4829301746, 5938201746, 'Internal Transfer Transaction', 4200.00, 'EUR', 'Paris, France', 48.856613, 2.352222, 'Success', '2026-08-05 15:45:20'),
('UTR260801000009', 5938201746, 6849201837, 'Transfer Transaction', 35000.00, 'AUD', 'Sydney, Australia', -33.868820, 151.209290, 'Success', '2026-08-06 09:12:40'),
('UTR260801000010', 6849201837, 4019283741, 'Withdrawal Transaction', 450000.00, 'JPY', 'Tokyo, Japan', 35.676200, 139.650300, 'Flagged', '2026-08-06 23:55:17'),
('UTR260801000011', 1192837401, 2293847502, 'Payment Transaction', 2100.00, 'EUR', 'Rome, Italy', 41.902782, 12.496366, 'Success', '2026-08-07 08:15:30'),
('UTR260801000012', 2293847502, 3394857603, 'External Transfer Transaction', 8400.00, 'EUR', 'Stockholm, Sweden', 59.329323, 18.068581, 'Success', '2026-08-07 10:45:12'),
('UTR260801000013', 3394857603, 4495867704, 'Transfer Transaction', 19000.00, 'USD', 'Sao Paulo, Brazil', -23.550520, -46.633308, 'Blocked', '2026-08-07 14:20:00'),
('UTR260801000014', 4495867704, 5596877805, 'Debit Transaction', 3500.00, 'INR', 'Mumbai, India', 19.075983, 72.877655, 'Success', '2026-08-08 09:10:45'),
('UTR260801000015', 5596877805, 6697887906, 'External Transfer Transaction', 48000.00, 'EUR', 'Berlin, Germany', 52.520008, 13.404954, 'Flagged', '2026-08-08 12:30:19'),
('UTR260801000016', 6697887906, 7798898007, 'Payment Transaction', 1420.00, 'EUR', 'Paris, France', 48.856613, 2.352222, 'Success', '2026-08-08 16:50:22'),
('UTR260801000017', 7798898007, 8899908108, 'External Transfer Transaction', 125000.00, 'USD', 'Riyadh, Saudi Arabia', 24.713552, 46.675297, 'Flagged', '2026-08-09 01:15:00'),
('UTR260801000018', 8899908108, 9900018209, 'Withdrawal Transaction', 9500.00, 'EUR', 'Prague, Czech Republic', 50.075539, 14.437800, 'Blocked', '2026-08-09 04:30:11'),
('UTR260801000019', 9900018209, 1011128310, 'Payment Transaction', 75000.00, 'USD', 'Singapore', 1.352083, 103.819839, 'Success', '2026-08-09 11:22:33'),
('UTR260801000020', 1011128310, 1122238411, 'Transfer Transaction', 15000.00, 'INR', 'Kochi, India', 9.931233, 76.267303, 'Success', '2026-08-09 15:40:50'),
('UTR260801000021', 1122238411, 1233348512, 'External Transfer Transaction', 18500.00, 'AUD', 'Sydney, Australia', -33.868820, 151.209290, 'Success', '2026-08-10 08:05:14'),
('UTR260801000022', 1233348512, 1344458613, 'Transfer Transaction', 12000.00, 'EUR', 'Warsaw, Poland', 52.229675, 21.012230, 'Flagged', '2026-08-10 11:15:25'),
('UTR260801000023', 1344458613, 1455568714, 'Withdrawal Transaction', 6200.00, 'USD', 'Lagos, Nigeria', 6.524379, 3.379206, 'Blocked', '2026-08-10 14:02:40'),
('UTR260801000024', 1455568714, 1566678815, 'Deposit Transaction', 11500.00, 'USD', 'Seoul, South Korea', 37.566536, 126.977966, 'Success', '2026-08-11 09:30:00'),
('UTR260801000025', 1566678815, 1677788916, 'Internal Transfer Transaction', 34000.00, 'USD', 'Mexico City, Mexico', 19.432608, -99.133209, 'Success', '2026-08-11 13:45:12'),
('UTR260801000026', 1677788916, 1788899017, 'Payment Transaction', 4900.00, 'EUR', 'Oslo, Norway', 59.913868, 10.752245, 'Success', '2026-08-11 18:20:00'),
('UTR260801000027', 1788899017, 1899909118, 'External Transfer Transaction', 150000.00, 'INR', 'Ahmedabad, India', 23.022505, 72.571365, 'Success', '2026-08-12 10:11:12'),
('UTR260801000028', 1899909118, 1910019219, 'Transfer Transaction', 9200.00, 'GBP', 'London, UK', 51.507351, -0.127758, 'Flagged', '2026-08-12 14:05:44'),
('UTR260801000029', 1910019219, 2021129320, 'Withdrawal Transaction', 11000.00, 'USD', 'Karachi, Pakistan', 24.860735, 67.001137, 'Blocked', '2026-08-12 19:30:15'),
('UTR260801000030', 2021129320, 2132239421, 'Payment Transaction', 3200.00, 'EUR', 'Madrid, Spain', 40.416775, -3.703790, 'Success', '2026-08-13 08:45:20'),
('UTR260801000031', 2132239421, 2243349522, 'External Transfer Transaction', 500000.00, 'INR', 'New Delhi, India', 28.613939, 77.209023, 'Success', '2026-08-13 11:12:09'),
('UTR260801000032', 2243349522, 2354459623, 'Transfer Transaction', 85000.00, 'USD', 'Chicago, USA', 41.878113, -87.629799, 'Success', '2026-08-13 15:20:30'),
('UTR260801000033', 2354459623, 2465569724, 'Withdrawal Transaction', 2500000.00, 'JPY', 'Osaka, Japan', 34.693737, 135.502167, 'Flagged', '2026-08-14 02:40:55'),
('UTR260801000034', 2465569724, 2576679825, 'Payment Transaction', 1250.00, 'CAD', 'Vancouver, Canada', 49.282730, -123.120735, 'Success', '2026-08-14 10:15:42'),
('UTR260801000035', 2576679825, 2687789926, 'Transfer Transaction', 7800.00, 'GBP', 'Manchester, UK', 53.480759, -2.242631, 'Blocked', '2026-08-14 13:50:18'),
('UTR260801000036', 2687789926, 2798890027, 'Deposit Transaction', 4500.00, 'USD', 'Cairo, Egypt', 30.044420, 31.235712, 'Success', '2026-08-14 16:30:00'),
('UTR260801000037', 2798890027, 2809900128, 'External Transfer Transaction', 14000.00, 'EUR', 'Dublin, Ireland', 53.349804, -6.260310, 'Success', '2026-08-15 09:12:35'),
('UTR260801000038', 2809900128, 2911010229, 'Payment Transaction', 45000.00, 'INR', 'Kolkata, India', 22.572645, 88.363892, 'Success', '2026-08-15 11:45:10'),
('UTR260801000039', 2911010229, 3022120330, 'Transfer Transaction', 6200.00, 'USD', 'San Francisco, USA', 37.774929, -122.419418, 'Success', '2026-08-15 14:02:11'),
('UTR260801000040', 3022120330, 3133230431, 'External Transfer Transaction', 18000.00, 'EUR', 'Lisbon, Portugal', 38.722253, -9.139337, 'Flagged', '2026-08-16 01:25:40'),
('UTR260801000041', 3133230431, 3244340532, 'Withdrawal Transaction', 9500.00, 'EUR', 'Kyiv, Ukraine', 50.450100, 30.523400, 'Flagged', '2026-08-16 05:10:20'),
('UTR260801000042', 3244340532, 3355450633, 'Debit Transaction', 25000.00, 'INR', 'Jaipur, India', 26.912434, 75.787270, 'Success', '2026-08-16 10:40:00'),
('UTR260801000043', 3355450633, 3466560734, 'External Transfer Transaction', 95000.00, 'EUR', 'Amsterdam, Netherlands', 52.367573, 4.904139, 'Success', '2026-08-16 14:15:30'),
('UTR260801000044', 3466560734, 3577670835, 'Transfer Transaction', 140000.00, 'USD', 'Doha, Qatar', 25.285447, 51.531040, 'Success', '2026-08-17 08:30:15'),
('UTR260801000045', 3577670835, 3688780936, 'Withdrawal Transaction', 15000.00, 'USD', 'Seattle, USA', 47.606209, -122.332069, 'Blocked', '2026-08-17 11:20:00'),
('UTR260801000046', 3688780936, 3799891037, 'Payment Transaction', 8900.00, 'INR', 'Patna, India', 25.594095, 85.137566, 'Success', '2026-08-17 15:10:45'),
('UTR260801000047', 3799891037, 3810901138, 'Internal Transfer Transaction', 12000.00, 'EUR', 'Copenhagen, Denmark', 55.676098, 12.568337, 'Success', '2026-08-18 09:40:12'),
('UTR260801000048', 3810901138, 3921011239, 'External Transfer Transaction', 350000.00, 'USD', 'Hong Kong', 22.319304, 114.169361, 'Flagged', '2026-08-18 13:55:20'),
('UTR260801000049', 3921011239, 4032121340, 'Withdrawal Transaction', 25000.00, 'USD', 'Kabul, Afghanistan', 34.555349, 69.207489, 'Blocked', '2026-08-18 16:30:00'),
('UTR260801000050', 4032121340, 4019283741, 'Transfer Transaction', 42000.00, 'AUD', 'Auckland, New Zealand', -36.848461, 174.763336, 'Success', '2026-08-19 10:15:33');



-- TABLE 4: ANOMALY_PATTERNS 
DROP TABLE IF EXISTS Anomaly_Patterns;

CREATE TABLE Anomaly_Patterns (
    anomaly_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_ref VARCHAR(20) NOT NULL,
    customer_id BIGINT NOT NULL,
    rule_code VARCHAR(50) NOT NULL,
    flag_reason VARCHAR(255) NOT NULL,
    flagged_amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    risk_score DECIMAL(5,2) NOT NULL,
    severity_level ENUM(
        'Negligible',
        'Low',
        'Medium',
        'High',
        'Critical',
        'Catastrophic'
    ) NOT NULL,
    action_taken ENUM(
        'Allow',
        'Flag_For_Review',
        'Require_2FA',
        'Block_Temporary',
        'Block_Permanent'
    ) NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolution_notes TEXT,
    reviewed_by VARCHAR(100) NOT NULL DEFAULT 'System',
    detected_at DATETIME NOT NULL,
    resolved_at DATETIME NULL,

    FOREIGN KEY (transaction_ref)
        REFERENCES Transactions(transaction_ref)
        ON DELETE CASCADE,

    FOREIGN KEY (customer_id)
        REFERENCES Customers(customer_id)
        ON DELETE CASCADE
);

INSERT INTO Anomaly_Patterns
(
    transaction_ref,
    customer_id,
    rule_code,
    flag_reason,
    flagged_amount,
    currency,
    risk_score,
    severity_level,
    action_taken,
    is_resolved,
    resolution_notes,
    reviewed_by,
    detected_at,
    resolved_at
)
VALUES
('UTR260801000001', 84920115, 'NORMAL_PATTERN_01', 'Transaction is only slightly different from normal pattern', 18500.00, 'INR', 10.50, 'Negligible', 'Allow', TRUE, 'Transaction confirmed as normal activity', 'RULE_ENGINE', '2026-08-01 09:43:00', '2026-08-01 09:45:00'),
('UTR260801000002', 91823049, 'LOW_AMOUNT_02', 'Transaction amount slightly outside normal spending range', 5000.00, 'USD', 25.40, 'Low', 'Flag_For_Review', TRUE, 'Confirmed legitimate after check', 'TRANSACTION_MONITOR', '2026-08-01 14:19:00', '2026-08-01 15:10:00'),
('UTR260801000003', 67291043, 'FOREIGN_LOCATION_03', 'High-value transaction originated from unfamiliar country', 4250.00, 'GBP', 92.30, 'Critical', 'Block_Temporary', FALSE, 'Awaiting customer verification', 'FRAUD_ENGINE', '2026-08-02 22:57:00', NULL),
('UTR260801000004', 30482194, 'THRESHOLD_AMOUNT_04', 'Withdrawal close to configured fraud monitoring threshold', 12000.00, 'INR', 67.80, 'High', 'Flag_For_Review', FALSE, 'Queued for AML compliance review', 'AML_COMPLIANCE', '2026-08-03 11:08:00', NULL),
('UTR260801000005', 51028374, 'LOW_VARIANCE_05', 'Minor deviation from historical payment behaviour', 850.00, 'USD', 15.75, 'Negligible', 'Allow', TRUE, 'No suspicious behaviour detected', 'PAYMENT_MONITOR', '2026-08-03 13:23:00', '2026-08-03 13:24:00'),
('UTR260801000006', 62839104, 'VELOCITY_LIMIT_06', 'Multiple rapid transfers exceeding normal velocity limit', 15000.00, 'CAD', 87.40, 'Critical', 'Flag_For_Review', FALSE, 'Queued for manual investigation', 'VELOCITY_MONITOR', '2026-08-04 02:15:00', NULL),
('UTR260801000007', 73192048, 'LOCATION_VARIANCE_07', 'Originated from unusual location relative to recent activity', 27500.00, 'AED', 45.60, 'Medium', 'Require_2FA', TRUE, 'Customer verified via OTP', 'GEOLOCATION_ENGINE', '2026-08-04 10:33:00', '2026-08-04 10:36:00'),
('UTR260801000008', 48201937, 'TRANSFER_VARIANCE_08', 'Internal transfer frequency deviation', 4200.00, 'EUR', 38.20, 'Low', 'Flag_For_Review', TRUE, 'Verified as scheduled standing order', 'TRANSACTION_MONITOR', '2026-08-05 15:46:00', '2026-08-05 16:20:00'),
('UTR260801000009', 59381720, 'INVESTMENT_SPIKE_09', 'Investment transfer significantly above historical volume', 35000.00, 'AUD', 73.50, 'High', 'Require_2FA', FALSE, 'Additional verification pending', 'INVESTMENT_MONITOR', '2026-08-06 09:13:00', NULL),
('UTR260801000010', 68429103, 'AMOUNT_SPIKE_10', 'Amount is extremely higher than historical average', 450000.00, 'JPY', 98.60, 'Catastrophic', 'Block_Permanent', FALSE, 'Extreme amount spike blocked', 'AMOUNT_ENGINE', '2026-08-06 23:56:00', NULL),
('UTR260801000011', 11928374, 'MERCHANT_CHECK_11', 'Routine merchant checkout pattern match', 2100.00, 'EUR', 12.00, 'Negligible', 'Allow', TRUE, 'Standard retail payment validated', 'PAYMENT_MONITOR', '2026-08-07 08:16:00', '2026-08-07 08:17:00'),
('UTR260801000012', 22938475, 'CROSS_BORDER_12', 'Cross-border EU transaction with slight amount jump', 8400.00, 'EUR', 34.00, 'Low', 'Allow', TRUE, 'SEPA verification passed', 'TRANSFER_MONITOR', '2026-08-07 10:46:00', '2026-08-07 10:50:00'),
('UTR260801000013', 33948576, 'RAPID_DRAIN_13', 'Attempt to clear entire account balance immediately', 19000.00, 'USD', 96.50, 'Catastrophic', 'Block_Permanent', FALSE, 'Account balance draining attempt caught', 'DRAIN_DETECTOR', '2026-08-07 14:21:00', NULL),
('UTR260801000014', 44958677, 'POS_DEVIATION_14', 'Minor deviation in domestic POS merchant location', 3500.00, 'INR', 18.20, 'Negligible', 'Allow', TRUE, 'Customer matched local terminal', 'GEO_FILTER', '2026-08-08 09:11:00', '2026-08-08 09:12:00'),
('UTR260801000015', 55968778, 'CORP_SURGE_15', 'Large corporate payout scheduled outside office hours', 48000.00, 'EUR', 62.10, 'High', 'Flag_For_Review', FALSE, 'Pending CFO authentication', 'CORP_RULE_ENGINE', '2026-08-08 12:31:00', NULL),
('UTR260801000016', 66978879, 'ROUTINE_PAY_16', 'Normal recurring monthly subscription fee', 1420.00, 'EUR', 8.50, 'Negligible', 'Allow', TRUE, 'Matched whitelist template', 'SUBSCRIPTION_ENGINE', '2026-08-08 16:51:00', '2026-08-08 16:52:00'),
('UTR260801000017', 77988980, 'HIGH_RISK_JUR_17', 'Wire destined to high-risk international entity', 125000.00, 'USD', 91.00, 'Critical', 'Block_Temporary', FALSE, 'Blocked pending sanctions screening', 'SANCTION_SCREENER', '2026-08-09 01:16:00', NULL),
('UTR260801000018', 88999081, 'FROZEN_ATTEMPT_18', 'Withdrawal initiated on frozen custodial account', 9500.00, 'EUR', 99.10, 'Catastrophic', 'Block_Permanent', FALSE, 'Blocked by frozen account policy', 'POLICY_ENFORCER', '2026-08-09 04:31:00', NULL),
('UTR260801000019', 99000182, 'BULK_SETTLE_19', 'Commercial bulk clearing during operating peak', 75000.00, 'USD', 22.00, 'Low', 'Allow', TRUE, 'Standard clearing batch cleared', 'BATCH_MONITOR', '2026-08-09 11:23:00', '2026-08-09 11:25:00'),
('UTR260801000020', 10111283, 'DOMESTIC_P2P_20', 'Routine peer-to-peer inter-bank payment', 15000.00, 'INR', 14.50, 'Negligible', 'Allow', TRUE, 'Cleared without flags', 'P2P_ENGINE', '2026-08-09 15:41:00', '2026-08-09 15:42:00'),
('UTR260801000021', 11222384, 'FOREIGN_WIRE_21', 'Transfer dispatched to offshore correspondent', 18500.00, 'AUD', 49.00, 'Medium', 'Require_2FA', TRUE, 'SMS OTP completed successfully', 'AUTH_GATEWAY', '2026-08-10 08:06:00', '2026-08-10 08:08:00'),
('UTR260801000022', 12333485, 'SUSP_HOURS_22', 'Transaction issued under high network anomaly load', 12000.00, 'EUR', 82.50, 'Critical', 'Flag_For_Review', FALSE, 'Investigating device fingerprint', 'DEVICE_PROFILER', '2026-08-10 11:16:00', NULL),
('UTR260801000023', 13444586, 'SUSP_STATUS_23', 'Access attempt from suspended customer ID', 6200.00, 'USD', 95.00, 'Catastrophic', 'Block_Permanent', FALSE, 'Auto-blocked under active suspension', 'POLICY_ENFORCER', '2026-08-10 14:03:00', NULL),
('UTR260801000024', 14555687, 'CASH_INFLOW_24', 'Above-average cash deposit into personal account', 11500.00, 'USD', 31.00, 'Low', 'Flag_For_Review', TRUE, 'Source of funds declared by customer', 'KYC_ANALYST', '2026-08-11 09:31:00', '2026-08-11 10:15:00'),
('UTR260801000025', 15666788, 'INTL_CORP_25', 'Expected commercial partner supplier disbursement', 34000.00, 'USD', 42.00, 'Medium', 'Require_2FA', TRUE, 'Hardware token authorization received', 'TOKEN_SERVICE', '2026-08-11 13:46:00', '2026-08-11 13:48:00'),
('UTR260801000026', 16777889, 'SMALL_PAY_26', 'Normal recurring supplier invoice payment', 4900.00, 'EUR', 11.20, 'Negligible', 'Allow', TRUE, 'Profile baseline fully satisfied', 'INVOICE_ENGINE', '2026-08-11 18:21:00', '2026-08-11 18:22:00'),
('UTR260801000027', 17888990, 'HIGH_TICKET_27', 'Commercial capital investment inter-bank wire', 150000.00, 'INR', 54.00, 'Medium', 'Require_2FA', TRUE, 'Confirmed with secondary account owner', 'CALL_CENTER_DESK', '2026-08-12 10:12:00', '2026-08-12 10:20:00'),
('UTR260801000028', 18999091, 'UNUSUAL_GEO_28', 'Transaction executed from disparate IP subnet', 9200.00, 'GBP', 79.50, 'High', 'Flag_For_Review', FALSE, 'Awaiting user IP verification response', 'NETWORK_SENTINEL', '2026-08-12 14:06:00', NULL),
('UTR260801000029', 19100192, 'SANCTION_BLOCK_29', 'Blocked withdrawal attempt on restricted profile', 11000.00, 'USD', 94.00, 'Critical', 'Block_Permanent', FALSE, 'Account barred under restriction notice', 'COMPLIANCE_OPS', '2026-08-12 19:31:00', NULL),
('UTR260801000030', 20211293, 'MICRO_TEST_30', 'Standard utility billing clearance', 3200.00, 'EUR', 9.80, 'Negligible', 'Allow', TRUE, 'Recurring utility transaction verified', 'UTILITY_MATCHER', '2026-08-13 08:46:00', '2026-08-13 08:47:00'),
('UTR260801000031', 21322394, 'CORP_DIVIDEND_31', 'Quarterly payroll allocation from corporate reserve', 500000.00, 'INR', 48.00, 'Medium', 'Require_2FA', TRUE, 'Corporate dual-admin approval verified', 'CORP_PORTAL', '2026-08-13 11:13:00', '2026-08-13 11:18:00'),
('UTR260801000032', 22433495, 'PORTFOLIO_ADJ_32', 'Rebalancing wire between managed brokerage books', 85000.00, 'USD', 36.50, 'Low', 'Allow', TRUE, 'Brokerage automated authorization verified', 'PORTFOLIO_GUARD', '2026-08-13 15:21:00', '2026-08-13 15:22:00'),
('UTR260801000033', 23544596, 'ATM_SPIKE_33', 'Extreme cash withdrawal requested at midnight', 2500000.00, 'JPY', 88.90, 'Critical', 'Block_Temporary', FALSE, 'ATM terminal lock initiated for safety', 'ATM_SENTINEL', '2026-08-14 02:41:00', NULL),
('UTR260801000034', 24655697, 'ECOM_PURCHASE_34', 'Point of sale grocery chain debit clearance', 1250.00, 'CAD', 7.40, 'Negligible', 'Allow', TRUE, 'Low risk merchant match', 'POS_MONITOR', '2026-08-14 10:16:00', '2026-08-14 10:17:00'),
('UTR260801000035', 25766798, 'LOCKED_BREACH_35', 'Debit execution requested on administratively locked vault', 7800.00, 'GBP', 97.20, 'Catastrophic', 'Block_Permanent', FALSE, 'Immediate hard lock upheld', 'SECURITY_DIRECTOR', '2026-08-14 13:51:00', NULL),
('UTR260801000036', 26877899, 'DEPOSIT_CREDIT_36', 'Foreign remittance processed via partner bank', 4500.00, 'USD', 28.00, 'Low', 'Allow', TRUE, 'Remittance partner validation complete', 'REMITTANCE_GW', '2026-08-14 16:31:00', '2026-08-14 16:33:00'),
('UTR260801000037', 27988900, 'SEPA_TRANSFER_37', 'Eurozone settlement transfer completed normally', 14000.00, 'EUR', 21.50, 'Low', 'Allow', TRUE, 'Target IBAN confirmed benign', 'CLEARING_DESK', '2026-08-15 09:13:00', '2026-08-15 09:15:00'),
('UTR260801000038', 28099001, 'TAX_ADVANCE_38', 'Advance tax payment settlement to treasury desk', 45000.00, 'INR', 32.00, 'Low', 'Allow', TRUE, 'Treasury portal match', 'GOV_GATEWAY', '2026-08-15 11:46:00', '2026-08-15 11:47:00'),
('UTR260801000039', 29110102, 'NEW_BENEFICIARY_39', 'Direct debit sent to newly created external payee', 6200.00, 'USD', 46.50, 'Medium', 'Require_2FA', TRUE, 'Customer approved new payee via push alert', 'PUSH_SECURITY', '2026-08-15 14:03:00', '2026-08-15 14:05:00'),
('UTR260801000040', 30221203, 'IMPOSSIBLE_TRAVEL_40', 'Dispatched from IP separated by 5000 miles in 1 hr', 18000.00, 'EUR', 93.40, 'Critical', 'Block_Temporary', FALSE, 'Velocity travel flag raised - session frozen', 'GEO_AI_CORE', '2026-08-16 01:26:00', NULL),
('UTR260801000041', 31332304, 'GEOPOLITICAL_RISK_41', 'Withdrawal flagged due to high conflict geography proxy', 9500.00, 'EUR', 76.80, 'High', 'Flag_For_Review', FALSE, 'Under sanctions desk review', 'SANCTION_SCREENER', '2026-08-16 05:11:00', NULL),
('UTR260801000042', 32443405, 'ECOMMERCE_CHECK_42', 'Domestic payment to certified electronics vendor', 25000.00, 'INR', 19.30, 'Negligible', 'Allow', TRUE, 'Merchant certified on PCI-DSS', 'PAYMENT_MONITOR', '2026-08-16 10:41:00', '2026-08-16 10:42:00'),
('UTR260801000043', 33554506, 'B2B_SUPPLY_43', 'High-volume wholesale logistics invoice payment', 95000.00, 'EUR', 39.80, 'Low', 'Allow', TRUE, 'Purchase order matched to SAP', 'ERP_CONNECTOR', '2026-08-16 14:16:00', '2026-08-16 14:20:00'),
('UTR260801000044', 34665607, 'TREASURY_SWEEP_44', 'Inter-corporate liquidity pooling sweep', 140000.00, 'USD', 51.00, 'Medium', 'Require_2FA', TRUE, 'Multi-sig cryptographic signature accepted', 'SWIFT_DAEMON', '2026-08-17 08:31:00', '2026-08-17 08:35:00'),
('UTR260801000045', 35776708, 'DORMANT_DRAIN_45', 'Withdrawal initiated on dormant account after 3 years', 15000.00, 'USD', 99.50, 'Catastrophic', 'Block_Permanent', FALSE, 'Account compromised after prolonged dormancy', 'DORMANT_WATCHER', '2026-08-17 11:21:00', NULL),
('UTR260801000046', 36887809, 'FAST_P2P_46', 'Routine local peer remittance for family support', 8900.00, 'INR', 13.70, 'Negligible', 'Allow', TRUE, 'Whitelisted domestic contact', 'RULE_ENGINE', '2026-08-17 15:11:00', '2026-08-17 15:12:00'),
('UTR260801000047', 37998910, 'SWIFT_INVOICE_47', 'Invoice settlement matching Nordic vendor records', 12000.00, 'EUR', 26.40, 'Low', 'Allow', TRUE, 'Standard Nordic clearing network cleared', 'TRANSACTION_MONITOR', '2026-08-18 09:41:00', '2026-08-18 09:44:00'),
('UTR260801000048', 38109011, 'OFFSHORE_FLOW_48', 'Massive offshore transfer into private vault', 350000.00, 'USD', 86.70, 'Critical', 'Flag_For_Review', FALSE, 'Under review for potential capital flight', 'AML_COMPLIANCE', '2026-08-18 13:56:00', NULL),
('UTR260801000049', 39210112, 'TERMINATED_USE_49', 'Attempted wire from terminated customer ID', 25000.00, 'USD', 98.90, 'Catastrophic', 'Block_Permanent', FALSE, 'System refused request on terminated identity', 'FRAUD_ENGINE', '2026-08-18 16:31:00', NULL),
('UTR260801000050', 40321213, 'PACIFIC_SETTLE_50', 'Superannuation pension rollover transfer', 42000.00, 'AUD', 30.10, 'Low', 'Allow', TRUE, 'Certified superannuation transfer completed', 'RULE_ENGINE', '2026-08-19 10:16:00', '2026-08-19 10:20:00');



-- TABLE 5: DISPUTE_LOGS 
DROP TABLE IF EXISTS Dispute_Logs;

CREATE TABLE Dispute_Logs (
    dispute_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_ref VARCHAR(20) NOT NULL,
    customer_id BIGINT NOT NULL,
    dispute_type ENUM(
        'Unauthorized Transaction',
        'Duplicate Transaction',
        'Incorrect Amount',
        'Merchant Dispute',
        'Fraud Dispute',
        'Other'
    ) NOT NULL,
    dispute_reason VARCHAR(255) NOT NULL,
    dispute_amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    dispute_status ENUM(
        'Open',
        'Under Investigation',
        'Resolved',
        'Rejected',
        'Escalated'
    ) NOT NULL,
    filed_at DATETIME NOT NULL,
    resolved_at DATETIME NULL,

    FOREIGN KEY (transaction_ref)
        REFERENCES Transactions(transaction_ref)
        ON DELETE CASCADE,

    FOREIGN KEY (customer_id)
        REFERENCES Customers(customer_id)
        ON DELETE CASCADE
);

INSERT INTO Dispute_Logs
(
    transaction_ref,
    customer_id,
    dispute_type,
    dispute_reason,
    dispute_amount,
    currency,
    dispute_status,
    filed_at,
    resolved_at
)
VALUES
('UTR260801000001', 84920115, 'Incorrect Amount', 'Discrepancy during INR inter-account transfer', 18500.00, 'INR', 'Resolved', '2026-08-01 11:30:00', '2026-08-01 12:45:00'),
('UTR260801000002', 91823049, 'Other', 'Deposit confirmation delay raised during settlement', 5000.00, 'USD', 'Resolved', '2026-08-01 16:00:00', '2026-08-01 17:30:00'),
('UTR260801000003', 67291043, 'Fraud Dispute', 'Customer denied initiating international wire', 4250.00, 'GBP', 'Under Investigation', '2026-08-02 23:15:00', NULL),
('UTR260801000004', 30482194, 'Unauthorized Transaction', 'Customer questioned unacknowledged cash withdrawal attempt', 12000.00, 'INR', 'Under Investigation', '2026-08-03 12:45:00', NULL),
('UTR260801000005', 51028374, 'Merchant Dispute', 'Customer double-billed by online SaaS merchant', 850.00, 'USD', 'Resolved', '2026-08-03 14:30:00', '2026-08-03 16:15:00'),
('UTR260801000006', 62839104, 'Unauthorized Transaction', 'Customer reported unapproved external transfer', 15000.00, 'CAD', 'Open', '2026-08-04 03:00:00', NULL),
('UTR260801000007', 73192048, 'Other', 'Multiple OTP challenges received while executing invoice', 27500.00, 'AED', 'Resolved', '2026-08-04 11:00:00', '2026-08-04 11:45:00'),
('UTR260801000008', 48201937, 'Incorrect Amount', 'Dispute over foreign transaction conversion surcharge', 4200.00, 'EUR', 'Resolved', '2026-08-05 17:00:00', '2026-08-05 18:20:00'),
('UTR260801000009', 59381720, 'Fraud Dispute', 'Customer contested sudden spike in brokerage portfolio', 35000.00, 'AUD', 'Under Investigation', '2026-08-06 10:15:00', NULL),
('UTR260801000010', 68429103, 'Fraud Dispute', 'Unauthorized high-balance JPY withdrawal attempt', 450000.00, 'JPY', 'Escalated', '2026-08-07 00:30:00', NULL),
('UTR260801000011', 11928374, 'Merchant Dispute', 'Merchant charged incorrect currency conversion markup', 2100.00, 'EUR', 'Resolved', '2026-08-07 09:30:00', '2026-08-07 14:00:00'),
('UTR260801000012', 22938475, 'Duplicate Transaction', 'Customer claimed SEPA transaction billed two times', 8400.00, 'EUR', 'Resolved', '2026-08-07 12:00:00', '2026-08-07 13:10:00'),
('UTR260801000013', 33948576, 'Fraud Dispute', 'Malicious actor compromised online banking session', 19000.00, 'USD', 'Escalated', '2026-08-07 15:00:00', NULL),
('UTR260801000014', 44958677, 'Incorrect Amount', 'Point-of-sale terminal debited excess amount', 3500.00, 'INR', 'Resolved', '2026-08-08 10:00:00', '2026-08-08 11:30:00'),
('UTR260801000015', 55968778, 'Unauthorized Transaction', 'Accountant contested off-hours batch payment release', 48000.00, 'EUR', 'Under Investigation', '2026-08-08 13:45:00', NULL),
('UTR260801000016', 66978879, 'Merchant Dispute', 'Service subscription canceled prior to auto-debit', 1420.00, 'EUR', 'Resolved', '2026-08-08 17:30:00', '2026-08-08 18:45:00'),
('UTR260801000017', 77988980, 'Fraud Dispute', 'Customer states wire request altered by man-in-middle attack', 125000.00, 'USD', 'Escalated', '2026-08-09 02:00:00', NULL),
('UTR260801000018', 88999081, 'Unauthorized Transaction', 'Attempt made on frozen assets by unknown third party', 9500.00, 'EUR', 'Under Investigation', '2026-08-09 06:10:00', NULL),
('UTR260801000019', 99000182, 'Other', 'Batch settlement record delay reported by corporate client', 75000.00, 'USD', 'Resolved', '2026-08-09 13:00:00', '2026-08-09 14:00:00'),
('UTR260801000020', 10111283, 'Incorrect Amount', 'Beneficiary claims receiving funds short of fees', 15000.00, 'INR', 'Resolved', '2026-08-09 16:30:00', '2026-08-09 17:15:00'),
('UTR260801000021', 11222384, 'Other', 'Customer questioned foreign intermediary bank surcharge', 18500.00, 'AUD', 'Resolved', '2026-08-10 09:30:00', '2026-08-10 11:00:00'),
('UTR260801000022', 12333485, 'Unauthorized Transaction', 'Customer denies initiating wire transfer to unfamiliar party', 12000.00, 'EUR', 'Under Investigation', '2026-08-10 12:30:00', NULL),
('UTR260801000023', 13444586, 'Fraud Dispute', 'Suspended account debit attempt disavowed by account holder', 6200.00, 'USD', 'Escalated', '2026-08-10 15:15:00', NULL),
('UTR260801000024', 14555687, 'Incorrect Amount', 'Cash deposit machine recorded different denomination total', 11500.00, 'USD', 'Resolved', '2026-08-11 11:00:00', '2026-08-11 12:30:00'),
('UTR260801000025', 15666788, 'Merchant Dispute', 'Counterparty disputing goods delivery schedule', 34000.00, 'USD', 'Under Investigation', '2026-08-11 15:00:00', NULL),
('UTR260801000026', 16777889, 'Duplicate Transaction', 'Recurring invoice debited twice by logistics partner', 4900.00, 'EUR', 'Resolved', '2026-08-11 19:30:00', '2026-08-11 20:45:00'),
('UTR260801000027', 17888990, 'Other', 'Verification query regarding commercial high-value transfer', 150000.00, 'INR', 'Resolved', '2026-08-12 11:30:00', '2026-08-12 12:15:00'),
('UTR260801000028', 18999091, 'Unauthorized Transaction', 'Customer claims account accessed from rogue device', 9200.00, 'GBP', 'Open', '2026-08-12 15:00:00', NULL),
('UTR260801000029', 19100192, 'Fraud Dispute', 'Account holder contesting administrative blockage on account', 11000.00, 'USD', 'Rejected', '2026-08-12 21:00:00', '2026-08-13 09:00:00'),
('UTR260801000030', 20211293, 'Merchant Dispute', 'Utility company applied charges post termination notice', 3200.00, 'EUR', 'Resolved', '2026-08-13 10:00:00', '2026-08-13 11:30:00'),
('UTR260801000031', 21322394, 'Other', 'Payroll compliance auditing inquiry filed by HR director', 500000.00, 'INR', 'Resolved', '2026-08-13 12:30:00', '2026-08-13 14:00:00'),
('UTR260801000032', 22433495, 'Incorrect Amount', 'Brokerage portfolio allocation variance dispute', 85000.00, 'USD', 'Resolved', '2026-08-13 16:30:00', '2026-08-13 17:45:00'),
('UTR260801000033', 23544596, 'Fraud Dispute', 'Customer was asleep during ATM cash dispensing event', 2500000.00, 'JPY', 'Escalated', '2026-08-14 04:00:00', NULL),
('UTR260801000034', 24655697, 'Merchant Dispute', 'Customer charged for items returned on delivery', 1250.00, 'CAD', 'Resolved', '2026-08-14 11:30:00', '2026-08-14 13:00:00'),
('UTR260801000035', 25766798, 'Unauthorized Transaction', 'Breach attempted on locked profile without authorization', 7800.00, 'GBP', 'Escalated', '2026-08-14 15:00:00', NULL),
('UTR260801000036', 26877899, 'Other', 'Delay in international remittance clearing inquiry', 4500.00, 'USD', 'Resolved', '2026-08-14 18:00:00', '2026-08-14 19:15:00'),
('UTR260801000037', 27988900, 'Duplicate Transaction', 'SEPA payment showed duplicate debit on statement', 14000.00, 'EUR', 'Resolved', '2026-08-15 10:30:00', '2026-08-15 12:00:00'),
('UTR260801000038', 28099001, 'Incorrect Amount', 'Dispute over state tax assessment fee applied by portal', 45000.00, 'INR', 'Resolved', '2026-08-15 13:00:00', '2026-08-15 14:15:00'),
('UTR260801000039', 29110102, 'Fraud Dispute', 'Customer claims phishing attack compromised login', 6200.00, 'USD', 'Under Investigation', '2026-08-15 15:30:00', NULL),
('UTR260801000040', 30221203, 'Unauthorized Transaction', 'User logged into Portugal account while physical person was in Japan', 18000.00, 'EUR', 'Escalated', '2026-08-16 02:30:00', NULL),
('UTR260801000041', 31332304, 'Unauthorized Transaction', 'Customer reports SIM swap attack and unauthorized withdrawal', 9500.00, 'EUR', 'Open', '2026-08-16 07:00:00', NULL),
('UTR260801000042', 32443405, 'Merchant Dispute', 'Defective equipment delivered by electronics merchant', 25000.00, 'INR', 'Resolved', '2026-08-16 12:00:00', '2026-08-16 15:30:00'),
('UTR260801000043', 33554506, 'Other', 'Request for audit confirmation statement for B2B supplier', 95000.00, 'EUR', 'Resolved', '2026-08-16 16:00:00', '2026-08-16 17:00:00'),
('UTR260801000044', 34665607, 'Incorrect Amount', 'Foreign exchange spread disputed on corporate treasury sweep', 140000.00, 'USD', 'Resolved', '2026-08-17 10:00:00', '2026-08-17 11:15:00'),
('UTR260801000045', 35776708, 'Fraud Dispute', 'Identity theft attempted on long-dormant balance', 15000.00, 'USD', 'Escalated', '2026-08-17 12:30:00', NULL),
('UTR260801000046', 36887809, 'Other', 'Transaction receipt request for family support transfer', 8900.00, 'INR', 'Resolved', '2026-08-17 16:00:00', '2026-08-17 16:30:00'),
('UTR260801000047', 37998910, 'Merchant Dispute', 'Nordic vendor late fee contested by company bookkeeper', 12000.00, 'EUR', 'Resolved', '2026-08-18 11:00:00', '2026-08-18 12:20:00'),
('UTR260801000048', 38109011, 'Fraud Dispute', 'Corporate board member challenges large wire mandate', 350000.00, 'USD', 'Under Investigation', '2026-08-18 15:00:00', NULL),
('UTR260801000049', 39210112, 'Fraud Dispute', 'Attempted wire transfer on terminated identity record', 25000.00, 'USD', 'Rejected', '2026-08-18 17:45:00', '2026-08-18 18:30:00'),
('UTR260801000050', 40321213, 'Incorrect Amount', 'Dispute over superannuation rollover tax withholding figure', 42000.00, 'AUD', 'Resolved', '2026-08-19 12:00:00', '2026-08-19 13:45:00');

-- TABLE 6: AUDIT_TRAIL 
DROP TABLE IF EXISTS Audit_Trail;

CREATE TABLE Audit_Trail (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_ref VARCHAR(20),
    customer_id BIGINT,
    action_type VARCHAR(100) NOT NULL,
    action_description VARCHAR(255) NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    risk_score DECIMAL(5,2),
    severity_level VARCHAR(30),
    action_timestamp DATETIME NOT NULL,

    FOREIGN KEY (transaction_ref)
        REFERENCES Transactions(transaction_ref)
        ON DELETE SET NULL,

    FOREIGN KEY (customer_id)
        REFERENCES Customers(customer_id)
        ON DELETE SET NULL
);

INSERT INTO Audit_Trail
(
    transaction_ref,
    customer_id,
    action_type,
    action_description,
    performed_by,
    risk_score,
    severity_level,
    action_timestamp
)
VALUES
('UTR260801000001', 84920115, 'Transaction Approved', 'Low-risk transaction automatically approved', 'RULE_ENGINE', 10.50, 'Negligible', '2026-08-01 09:44:00'),
('UTR260801000002', 91823049, 'Transaction Verified', 'Manual check passed for initial deposit variance', 'TRANSACTION_MONITOR', 25.40, 'Low', '2026-08-01 15:10:00'),
('UTR260801000003', 67291043, 'Transaction Flagged', 'International transaction flagged for verification', 'FRAUD_ENGINE', 92.30, 'Critical', '2026-08-02 22:58:00'),
('UTR260801000004', 30482194, 'Manual Review', 'Withdrawal sent for AML review', 'AML_COMPLIANCE', 67.80, 'High', '2026-08-03 11:10:00'),
('UTR260801000005', 51028374, 'Payment Validated', 'Low deviation payment cleared standard merchant screening', 'PAYMENT_MONITOR', 15.75, 'Negligible', '2026-08-03 13:24:00'),
('UTR260801000006', 62839104, 'Velocity Alert', 'Unusual transaction frequency detected', 'VELOCITY_MONITOR', 87.40, 'Critical', '2026-08-04 02:16:00'),
('UTR260801000007', 73192048, '2FA Requested', 'Additional authentication requested', 'GEOLOCATION_ENGINE', 45.60, 'Medium', '2026-08-04 10:34:00'),
('UTR260801000008', 48201937, 'Internal Transfer Cleared', 'European domestic transfer cleared standard security rules', 'TRANSACTION_MONITOR', 38.20, 'Low', '2026-08-05 16:20:00'),
('UTR260801000009', 59381720, 'Investment Review', 'Portfolio transfer flagged for step-up multi-factor authentication', 'INVESTMENT_MONITOR', 73.50, 'High', '2026-08-06 09:14:00'),
('UTR260801000010', 68429103, 'Transaction Blocked', 'Extremely high-risk withdrawal blocked', 'AMOUNT_ENGINE', 98.60, 'Catastrophic', '2026-08-06 23:57:00'),
('UTR260801000011', 11928374, 'Direct Checkout Passed', 'Payment to verified retail vendor cleared automated check', 'PAYMENT_MONITOR', 12.00, 'Negligible', '2026-08-07 08:16:30'),
('UTR260801000012', 22938475, 'SEPA Transfer Cleared', 'Cross-border clearing processed without friction', 'TRANSFER_MONITOR', 34.00, 'Low', '2026-08-07 10:48:00'),
('UTR260801000013', 33948576, 'Account Drain Blocked', 'Critical safety mechanism triggered to prevent total balance loss', 'DRAIN_DETECTOR', 96.50, 'Catastrophic', '2026-08-07 14:22:00'),
('UTR260801000014', 44958677, 'Domestic POS Verified', 'Card swiped at authorized domestic terminal point', 'GEO_FILTER', 18.20, 'Negligible', '2026-08-08 09:11:30'),
('UTR260801000015', 55968778, 'Corporate Wire Flagged', 'Off-hours high value batch requires second approval signature', 'CORP_RULE_ENGINE', 62.10, 'High', '2026-08-08 12:32:00'),
('UTR260801000016', 66978879, 'Recurring Debit Cleared', 'Pre-registered debit mandate processed smoothly', 'SUBSCRIPTION_ENGINE', 8.50, 'Negligible', '2026-08-08 16:51:30'),
('UTR260801000017', 77988980, 'Sanctions Screening Alert', 'Automated hold placed on outbound international wire transfer', 'SANCTION_SCREENER', 91.00, 'Critical', '2026-08-09 01:17:00'),
('UTR260801000018', 88999081, 'Blocked Frozen Account', 'Immediate block triggered due to customer frozen compliance state', 'POLICY_ENFORCER', 99.10, 'Catastrophic', '2026-08-09 04:32:00'),
('UTR260801000019', 99000182, 'Commercial Settlement', 'Bulk clearing completed with no irregularities detected', 'BATCH_MONITOR', 22.00, 'Low', '2026-08-09 11:24:00'),
('UTR260801000020', 10111283, 'P2P Transfer Executed', 'Immediate real-time retail transfer fulfilled successfully', 'P2P_ENGINE', 14.50, 'Negligible', '2026-08-09 15:41:30'),
('UTR260801000021', 11222384, '2FA Authentication Passed', 'Customer confirmed cross-border transaction with secondary SMS key', 'AUTH_GATEWAY', 49.00, 'Medium', '2026-08-10 08:07:00'),
('UTR260801000022', 12333485, 'Device Anomaly Flagged', 'Unregistered hardware device profile flagged for review', 'DEVICE_PROFILER', 82.50, 'Critical', '2026-08-10 11:17:00'),
('UTR260801000023', 13444586, 'Suspended Profile Intercept', 'Transaction canceled due to existing customer suspension', 'POLICY_ENFORCER', 95.00, 'Catastrophic', '2026-08-10 14:04:00'),
('UTR260801000024', 14555687, 'Teller Inflow Confirmed', 'Cash balance updated following compliance documentation review', 'KYC_ANALYST', 31.00, 'Low', '2026-08-11 10:16:00'),
('UTR260801000025', 15666788, 'Hardware Token Validated', 'Corporate treasurer authorized outbound supplier balance', 'TOKEN_SERVICE', 42.00, 'Medium', '2026-08-11 13:47:00'),
('UTR260801000026', 16777889, 'Automated Invoice Success', 'Scheduled settlement authorized through standard pipeline', 'INVOICE_ENGINE', 11.20, 'Negligible', '2026-08-11 18:21:30'),
('UTR260801000027', 17888990, 'Call Center Confirmation', 'Telephone banking support confirmed legitimate user mandate', 'CALL_CENTER_DESK', 54.00, 'Medium', '2026-08-12 10:19:00'),
('UTR260801000028', 18999091, 'Suspicious Geolocation IP', 'Transaction queued for customer support phone outreach', 'NETWORK_SENTINEL', 79.50, 'High', '2026-08-12 14:07:00'),
('UTR260801000029', 19100192, 'Hard Restrict Action', 'Permanent failure applied to transaction per legal hold order', 'COMPLIANCE_OPS', 94.00, 'Critical', '2026-08-12 19:32:00'),
('UTR260801000030', 20211293, 'Standing Debit Executed', 'Utility billing successfully cleared without deviation', 'UTILITY_MATCHER', 9.80, 'Negligible', '2026-08-13 08:46:30'),
('UTR260801000031', 21322394, 'Multi-Signatory Clearance', 'Board corporate officer keys confirmed for corporate dividend wire', 'CORP_PORTAL', 48.00, 'Medium', '2026-08-13 11:17:00'),
('UTR260801000032', 22433495, 'Portfolio Adjustment Logged', 'Mutual fund asset swap completed under standard parameters', 'PORTFOLIO_GUARD', 36.50, 'Low', '2026-08-13 15:21:30'),
('UTR260801000033', 23544596, 'Cash Dispenser Intercept', 'Rapid high-value ATM withdrawal blocked at physical switch', 'ATM_SENTINEL', 88.90, 'Critical', '2026-08-14 02:42:00'),
('UTR260801000034', 24655697, 'Retail Merchant Cleared', 'Local point of sale grocery transaction approved', 'POS_MONITOR', 7.40, 'Negligible', '2026-08-14 10:16:30'),
('UTR260801000035', 25766798, 'Security Lock Protected', 'Security layer blocked execution against locked account balance', 'SECURITY_DIRECTOR', 97.20, 'Catastrophic', '2026-08-14 13:52:00'),
('UTR260801000036', 26877899, 'Inbound Clearing Passed', 'Remittance corridor transfer approved and deposited', 'REMITTANCE_GW', 28.00, 'Low', '2026-08-14 16:32:00'),
('UTR260801000037', 27988900, 'Euro Clearing Succeeded', 'SEPA instant transfer confirmed by receiving financial entity', 'CLEARING_DESK', 21.50, 'Low', '2026-08-15 09:14:00'),
('UTR260801000038', 28099001, 'Government Tax Routing', 'Corporate revenue advance tax successfully cleared to state desk', 'GOV_GATEWAY', 32.00, 'Low', '2026-08-15 11:46:30'),
('UTR260801000039', 29110102, 'Push Notification Verified', 'New external beneficiary confirmed through mobile app push token', 'PUSH_SECURITY', 46.50, 'Medium', '2026-08-15 14:04:00'),
('UTR260801000040', 30221203, 'Impossible Velocity Intercept', 'Impossible travel event flagged; customer account placed on security hold', 'GEO_AI_CORE', 93.40, 'Critical', '2026-08-16 01:27:00'),
('UTR260801000041', 31332304, 'Risk Origin Escalation', 'Conflict border geo-lookup triggered transaction quarantine', 'SANCTION_SCREENER', 76.80, 'High', '2026-08-16 05:12:00'),
('UTR260801000042', 32443405, 'PCI Merchant Clear', 'Payment to certified electronics vendor approved smoothly', 'PAYMENT_MONITOR', 19.30, 'Negligible', '2026-08-16 10:41:30'),
('UTR260801000043', 33554506, 'ERP Invoice Match', 'Logistics supply chain batch cross-referenced with purchase system', 'ERP_CONNECTOR', 39.80, 'Low', '2026-08-16 14:18:00'),
('UTR260801000044', 34665607, 'SWIFT Corporate Sweep', 'High volume internal treasury transfer authenticated via SWIFT GPI', 'SWIFT_DAEMON', 51.00, 'Medium', '2026-08-17 08:33:00'),
('UTR260801000045', 35776708, 'Compromised Dormant Lock', 'Dormant account reactivation rejected following risk analysis', 'DORMANT_WATCHER', 99.50, 'Catastrophic', '2026-08-17 11:22:00'),
('UTR260801000046', 36887809, 'P2P Micro-Payment Passed', 'Domestic transfer confirmed within normal velocity bands', 'RULE_ENGINE', 13.70, 'Negligible', '2026-08-17 15:11:30'),
('UTR260801000047', 37998910, 'Nordic Settlement Cleared', 'Cross-border B2B balance processed through clearing network', 'TRANSACTION_MONITOR', 26.40, 'Low', '2026-08-18 09:43:00'),
('UTR260801000048', 38109011, 'Offshore AML Hold', 'AML team alerted to unexplained large international outbound transfer', 'AML_COMPLIANCE', 86.70, 'Critical', '2026-08-18 13:57:00'),
('UTR260801000049', 39210112, 'Terminated Profile Rejected', 'Access definitively blocked for permanently closed customer entity', 'FRAUD_ENGINE', 98.90, 'Catastrophic', '2026-08-18 16:32:00'),
('UTR260801000050', 40321213, 'Superannuation Validated', 'Retirement transfer confirmed via regulatory portal interface', 'RULE_ENGINE', 30.10, 'Low', '2026-08-19 10:18:00');


SET FOREIGN_KEY_CHECKS = 1;
