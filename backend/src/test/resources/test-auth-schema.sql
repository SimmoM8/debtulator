create role anon nologin;
create role authenticated nologin;

create schema if not exists auth;

create table if not exists auth.users (
    id uuid primary key
);
