#!/usr/bin/env python3
"""
Read-only status and log viewer for the ytdl service.

Every check here is a GET against the manager's existing endpoints -- nothing
in this script mutates the service. It exists because the alternative is
hand-writing a `curl ... | python3 -c "..."` blob per question, which is both
tedious and impossible to grant a durable permission rule for.

  ./ytdl-status.py                     overall summary (exit 1 if degraded)
  ./ytdl-status.py workers             per-worker VPN exit IPs
  ./ytdl-status.py gluetun             tunnel + container state
  ./ytdl-status.py system              container memory and host health
  ./ytdl-status.py logs gluetun-1      logs, routed to the right endpoint
  ./ytdl-status.py logs worker-2 --raw keep the noise

Target another host with YTDL_URL, e.g. YTDL_URL=http://localhost:3001/
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get('YTDL_URL', 'https://ytdl.hermitcraft-horns.com/').rstrip('/')

# Gluetun logs every control-server request twice (an access line and an
# "unprotected route" warning). Left in, they crowd real tunnel events out of
# the tail entirely -- a 500-line fetch once covered eight minutes and
# contained zero connection events.
NOISE = (
    'is unprotected by default',
    'INFO [http server]',
)

INFRA = ('manager', 'ytdl', 'redis')


def get(path):
    try:
        with urllib.request.urlopen(f'{BASE}{path}', timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {'__error__': f'HTTP {e.code}', '__body__': e.read().decode('utf8', 'replace')[:200]}
    except Exception as e:
        return {'__error__': str(e)}


def failed(d):
    return isinstance(d, dict) and '__error__' in d


def die_if_failed(d, what):
    if failed(d):
        print(f'  ! could not reach {what}: {d["__error__"]}')
        sys.exit(2)


def cmd_workers(_args):
    d = get('/manager/workers/status')
    die_if_failed(d, 'manager')
    degraded = False
    for w in d:
        vpn = w.get('vpn') or {}
        ip = vpn.get('public_ip')
        if not ip:
            degraded = True
        state = (w.get('vpnStatus') or {}).get('status', '?')
        mark = ' ' if ip else '!'
        print(f'  {mark} {w["worker"]:<10} {ip or "NO IP":<18} {vpn.get("city", "-"):<16} {state}')
    return 1 if degraded else 0


def cmd_gluetun(_args):
    d = get('/manager/gluetun/status')
    die_if_failed(d, 'manager')
    degraded = False
    for g in d:
        cs = g.get('containerState', {})
        health = cs.get('health')
        ip = (g.get('publicIp') or {}).get('public_ip')
        if health != 'healthy' or not ip:
            degraded = True
        mark = ' ' if health == 'healthy' else '!'
        print(f'  {mark} {g["container"]:<10} {str(health):<10} ip={ip or "none":<16} '
              f'restarts={cs.get("restartCount")} up_since={(cs.get("startedAt") or "?")[:19]}')
    return 1 if degraded else 0


def cmd_system(_args):
    d = get('/manager/system/health')
    die_if_failed(d, 'manager')
    host = d.get('host') or {}
    print(f'  status={d.get("status")}  host_mem={host.get("memPercent")}%  swap={host.get("swapPercent")}%')
    degraded = False
    for c in d.get('containers', []):
        # A container reporting zero memory isn't running at all. That is a
        # real state here: workers depend on their gluetun being healthy, so a
        # tunnel that fails at deploy leaves its worker stopped.
        running = c['memoryUsageMB'] > 0
        if not running:
            degraded = True
        mark = ' ' if running else '!'
        detail = f'{c["memoryUsageMB"]:>4}MB / {c["memoryLimitMB"]:>4}MB  {c["memoryPercent"]:>3}%' \
            if running else 'NOT RUNNING'
        print(f'  {mark} {c["container"]:<12} {detail}')
    return 1 if degraded else 0


def cmd_logs(args):
    c = args.container
    if c.startswith('gluetun'):
        path = f'/manager/gluetun/logs?container={c}&tail={args.tail}'
    elif c.startswith('worker'):
        path = f'/manager/workers/logs?container={c}&tail={args.tail}'
    elif c in INFRA:
        path = f'/manager/infrastructure/logs?container={c}&tail={args.tail}'
    else:
        print(f'  ! unknown container "{c}" (expected gluetun-N, worker-N, or one of {", ".join(INFRA)})')
        return 2

    d = get(path)
    die_if_failed(d, 'manager')
    if not d.get('success'):
        print(f'  ! {d.get("error", d)}')
        return 2

    lines = [l for l in d.get('logs', '').split('\n') if l.strip()]
    if args.raw:
        kept, hidden = lines, 0
    else:
        kept = [l for l in lines if not any(n in l for n in NOISE)]
        hidden = len(lines) - len(kept)

    for l in kept:
        # Docker prefixes an RFC3339 timestamp; gluetun adds its own. Drop the
        # outer one so lines fit on a terminal.
        print('  ', l.split('Z ', 1)[-1] if 'Z ' in l[:35] else l)

    if hidden:
        print(f'\n  ({hidden} of {len(lines)} lines hidden as noise; --raw to show)')
    elif not kept:
        print('  (no log lines)')
    return 0


def cmd_summary(args):
    print('gluetun');  g = cmd_gluetun(args)
    print('\nworkers'); w = cmd_workers(args)
    print('\nsystem');  s = cmd_system(args)
    bad = g or w or s
    print(f'\n=> {"DEGRADED" if bad else "all healthy"}  ({BASE})')
    return 1 if bad else 0


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd')
    sub.add_parser('workers')
    sub.add_parser('gluetun')
    sub.add_parser('system')
    lg = sub.add_parser('logs')
    lg.add_argument('container')
    lg.add_argument('--tail', type=int, default=200)
    lg.add_argument('--raw', action='store_true')
    args = p.parse_args()

    fn = {
        'workers': cmd_workers,
        'gluetun': cmd_gluetun,
        'system': cmd_system,
        'logs': cmd_logs,
        None: cmd_summary,
    }[args.cmd]
    sys.exit(fn(args))


if __name__ == '__main__':
    main()
