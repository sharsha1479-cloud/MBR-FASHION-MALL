import csv
import json
import re
from datetime import datetime
from pathlib import Path

import mysql.connector


DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "Harsha@9866",
    "database": "mbr_fashion",
}

CSV_DIR = Path(r"D:\Oshoppe")

# Import parent rows before child rows so foreign keys have the best chance to pass.
IMPORTS = [
    ("User", "User.csv"),
    ("Category", "category.csv"),
    ("Banner", "banner.csv"),
    ("ComboProduct", "comboproduct.csv"),
    ("Coupon", "coupon.csv"),
    ("Cart", "cart.csv"),
    ("Order", "order.csv"),
    ("CartItem", "cartitem.csv"),
    ("OrderItem", "orderitem.csv"),
    ("CouponRedemption", "couponRedemption.csv"),
]

BOOL_TRUE = {"t", "true", "1", "yes", "y"}
BOOL_FALSE = {"f", "false", "0", "no", "n"}
TIME_ONLY_RE = re.compile(r"^\d{1,2}:\d{2}(:\d{2}(\.\d{1,6})?)?$")


def quote_identifier(identifier):
    return f"`{identifier.replace('`', '``')}`"


def get_table_columns(cursor, table_name):
    cursor.execute(f"SHOW COLUMNS FROM {quote_identifier(table_name)}")
    columns = {}
    for row in cursor.fetchall():
        field = row[0]
        column_type = row[1].lower()
        columns[field] = column_type
    return columns


def is_boolean_column(column_type):
    return column_type.startswith("tinyint(1)") or column_type == "boolean"


def is_datetime_column(column_type):
    return (
        column_type.startswith("datetime")
        or column_type.startswith("timestamp")
        or column_type.startswith("date")
        or column_type.startswith("time")
    )


def is_json_column(column_type):
    return column_type.startswith("json")


def parse_postgres_array(value):
    value = value.strip()
    if not (value.startswith("{") and value.endswith("}")):
        return None

    inner = value[1:-1].strip()
    if not inner:
        return []

    # PostgreSQL arrays in these exports are simple values like {S,M,L}.
    # csv.reader also handles quoted array members if they appear later.
    return [item.strip() for item in next(csv.reader([inner])) if item.strip()]


def normalize_json(value):
    if value is None or value == "":
        return json.dumps([])

    array_value = parse_postgres_array(value)
    if array_value is not None:
        return json.dumps(array_value)

    try:
        parsed = json.loads(value)
        return json.dumps(parsed)
    except json.JSONDecodeError:
        return json.dumps([value])


def normalize_datetime(value):
    if not value or TIME_ONLY_RE.match(value.strip()):
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cleaned = value.strip().replace("T", " ").replace("Z", "")
    if "+" in cleaned:
        cleaned = cleaned.split("+", 1)[0].strip()

    formats = [
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]

    for fmt in formats:
        try:
            parsed = datetime.strptime(cleaned, fmt)
            return parsed.strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            continue

    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def normalize_value(value, column_type):
    if value is None:
        return None

    value = value.strip()

    if is_json_column(column_type):
        return normalize_json(value)

    if value == "":
        return None

    lower_value = value.lower()

    if is_boolean_column(column_type):
        if lower_value in BOOL_TRUE:
            return 1
        if lower_value in BOOL_FALSE:
            return 0

    if is_datetime_column(column_type):
        return normalize_datetime(value)

    return value


def import_table(connection, table_name, csv_name):
    csv_path = CSV_DIR / csv_name
    if not csv_path.exists():
        print(f"{table_name}: skipped, missing {csv_path}")
        return

    cursor = connection.cursor()
    columns = get_table_columns(cursor, table_name)

    inserted = 0
    skipped = 0
    failed = 0

    with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if not reader.fieldnames:
            print(f"{table_name}: skipped, empty CSV")
            return

        csv_columns = [column for column in reader.fieldnames if column in columns]
        ignored_columns = [column for column in reader.fieldnames if column not in columns]

        if not csv_columns:
            print(f"{table_name}: skipped, no matching MySQL columns")
            return

        column_sql = ", ".join(quote_identifier(column) for column in csv_columns)
        placeholders = ", ".join(["%s"] * len(csv_columns))
        sql = f"INSERT IGNORE INTO {quote_identifier(table_name)} ({column_sql}) VALUES ({placeholders})"

        for row in reader:
            values = [
                normalize_value(row.get(column), columns[column])
                for column in csv_columns
            ]
            try:
                cursor.execute(sql, values)
                if cursor.rowcount:
                    inserted += 1
                else:
                    skipped += 1
            except mysql.connector.Error as error:
                failed += 1
                row_id = row.get("id", "<no id>")
                print(f"{table_name}: failed row id={row_id}: {error.msg}")

    connection.commit()
    cursor.close()

    ignored_note = f"; ignored CSV columns: {', '.join(ignored_columns)}" if ignored_columns else ""
    print(
        f"{table_name}: inserted {inserted}, skipped duplicates {skipped}, "
        f"failed {failed}{ignored_note}"
    )


def main():
    connection = mysql.connector.connect(**DB_CONFIG)
    try:
        for table_name, csv_name in IMPORTS:
            import_table(connection, table_name, csv_name)
    finally:
        connection.close()


if __name__ == "__main__":
    main()
