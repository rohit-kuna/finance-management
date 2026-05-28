CREATE USER demodb WITH ENCRYPTED PASSWORD 'demodb';
CREATE DATABASE demodb with owner demodb;

\connect demodb;

GRANT ALL PRIVILEGES ON DATABASE demodb TO demodb;