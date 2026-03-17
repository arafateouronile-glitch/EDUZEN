#!/bin/sh
exec gotenberg --api-port "${PORT:-3000}"
