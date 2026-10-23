#!/bin/sh
# Wait until the database accepts connections, before anything connects to it for real.
#
# s6-rc starts `migrate` after `postgres`, but `postgres` is a longrun: s6 calls the service started
# the moment the process is spawned, not when the server answers. The window in between is the one
# that produces, in the container log,
#
#   error: Failed query: CREATE SCHEMA IF NOT EXISTS "drizzle"
#   PostgresError: the database system is starting up
#
# and the ordering above then means nothing: `migrate` exits 1, s6 marks it failed, and `api` never
# starts because it depends on both. Waiting here is what makes the ordering mean what it says.
#
# The database it watches is the one `DATABASE_URL` names, which is the same one `migrate` uses, and
# `MIGRATE_WAIT_TIMEOUT` (seconds, default 60) bounds the wait.
set -eu
# DATABASE_URL carries the embedded cluster's password, and a traced run (`sh -x`) would print it
# with every expansion below. s6 does not trace, and a person debugging this does not need to leak
# a credential to find out what it is doing.
set +x

: "${DATABASE_URL:?DATABASE_URL must be set before waiting for the database}"
WAIT_TIMEOUT="${MIGRATE_WAIT_TIMEOUT:-60}"
# Digits only. `test -ge` compares integers and errors out on anything else, and an error inside an
# `if` condition does not stop the script: the wait would never expire.
case "$WAIT_TIMEOUT" in
  '' | *[!0-9]*)
    echo "migrate: MIGRATE_WAIT_TIMEOUT must be a whole number of seconds, got '$WAIT_TIMEOUT'." >&2
    exit 1
    ;;
esac
# Leading zeros stripped, so the length check below is about magnitude and not about spelling.
while :; do
  case "$WAIT_TIMEOUT" in
    0?*) WAIT_TIMEOUT="${WAIT_TIMEOUT#0}" ;;
    *) break ;;
  esac
done
WAIT_TIMEOUT="${WAIT_TIMEOUT:-0}"
# Six digits is the most `test` can compare on every shell this runs under; seven or more would
# error on every comparison instead of expiring the deadline. No deployment waits 11 days anyway.
case "$WAIT_TIMEOUT" in
  ???????*)
    echo "migrate: MIGRATE_WAIT_TIMEOUT must be at most 999999 seconds, got '$WAIT_TIMEOUT'." >&2
    exit 1
    ;;
esac

# `pg_isready` ships with the client package that the server package depends on, so a deployment
# with an embedded database has it. Named here rather than left to PATH, and failing loudly rather
# than silently skipping the wait, because a missing probe would put the bug above back.
PG_ISREADY=""
if command -v pg_isready >/dev/null 2>&1; then
  PG_ISREADY="$(command -v pg_isready)"
elif [ -x /usr/lib/postgresql/16/bin/pg_isready ]; then
  PG_ISREADY=/usr/lib/postgresql/16/bin/pg_isready
else
  echo "migrate: pg_isready is not installed, so the database cannot be waited for." >&2
  exit 1
fi

# Host, port, user and database out of DATABASE_URL. Parsed rather than handed to `pg_isready -d`
# as the URL, because a URL as an argument is visible in `/proc/<pid>/cmdline` to every user in the
# container, and for the embedded database this URL carries the password. The password is not
# parsed at all: readiness does not depend on credentials (a server that refuses them is up), and
# not holding it is one way for it not to reach a log line.
url="${DATABASE_URL#*://}"
authority="${url%%/*}"
case "$authority" in
  *@*) userinfo="${authority%@*}" ;;
  *) userinfo="" ;;
esac
user="${userinfo%%:*}"
hostport="${authority##*@}"
# A bracketed IPv6 literal is `[::1]:5432` or `[::1]`, and its colons are not separators.
case "$hostport" in
  \[*\]:*)
    host="${hostport#\[}"
    host="${host%%\]*}"
    port="${hostport##*\]:}"
    ;;
  \[*\])
    host="${hostport#\[}"
    host="${host%%\]*}"
    port=""
    ;;
  *:*)
    host="${hostport%%:*}"
    port="${hostport##*:}"
    ;;
  *)
    host="$hostport"
    port=""
    ;;
esac
case "$url" in
  */*)
    db="${url#*/}"
    db="${db%%\?*}"
    ;;
  *) db="" ;;
esac

# Both are refused by the migration itself, a few lines later in `scripts/migrate.ts`. Refused here
# too, because the alternative is a minute of waiting for a database the URL does not name.
if [ -z "$host" ] || [ -z "$db" ]; then
  echo "migrate: DATABASE_URL names no host or no database. Expected postgres://user:password@host:port/database." >&2
  exit 1
fi
case "${port:-5432}" in
  *[!0-9]*)
    echo "migrate: DATABASE_URL names a port that is not a number." >&2
    exit 1
    ;;
esac

# The exit status is the state: 0 accepting, 1 rejecting (starting up, or in recovery), 2 no
# response, 3 no attempt. Anything but 0 is not ready, which is what makes the transient
# "the database system is starting up" count as waiting rather than as a database.
#
# Passed through libpq's variables rather than as arguments, so nothing needs quoting and nothing
# beyond the host and port appears in the process table. No password: readiness does not depend on
# credentials, and the embedded cluster's password only has to be absent here.
# `-t 1`, so a probe against a black-holed address costs a second rather than two and the deadline
# below stays close to the timeout asked for.
probe() {
  PGUSER="$user" PGHOST="$host" PGPORT="${port:-5432}" PGDATABASE="$db" \
    "$PG_ISREADY" -q -t 1 >/dev/null 2>&1
}

start=$(date +%s)
elapsed=0
reported=0
announced=0
while :; do
  # A probe that answers "accepting" wins even at the last second: the point of the deadline is to
  # stop waiting on a database that is not coming, not to refuse one that arrived. One probe per
  # iteration, and the first iteration is also the immediate check, so a database that is already up
  # costs one probe and no waiting.
  if probe; then
    break
  fi
  # Read after the probe, not before it: a probe to an address that drops packets takes its whole
  # timeout, and a counter read first would let the deadline pass unheeded.
  elapsed=$(( $(date +%s) - start ))
  if [ "$announced" -eq 0 ]; then
    echo "migrate: waiting for the database at ${host:-localhost}:${port:-5432} (up to ${WAIT_TIMEOUT}s)"
    announced=1
    reported="$elapsed"
  fi
  if [ "$elapsed" -ge "$WAIT_TIMEOUT" ]; then
    echo "migrate: the database at ${host:-localhost}:${port:-5432} did not accept connections within ${WAIT_TIMEOUT}s; giving up." >&2
    exit 1
  fi
  # One line every ten seconds, so a slow boot is visible without filling the log with a probe a
  # second.
  if [ "$elapsed" -ge "$((reported + 10))" ]; then
    reported="$elapsed"
    echo "migrate: still waiting for the database (${elapsed}s)"
  fi
  sleep 1
done
elapsed=$(( $(date +%s) - start ))
echo "migrate: the database accepted connections after ${elapsed}s"
