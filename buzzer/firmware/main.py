# Buzzer box, firmware version 1.
#
# Runs on a Raspberry Pi Pico or Pico 2 with MicroPython. Copy this file to the Pico as main.py
# (see buzzer/README.md). It reads up to 8 team buttons, stamps every press with the time in
# microseconds since the host opened the buzzers, and lights the button of the team that answers.
#
# All buttons are read together in one register read, so two presses caught in the same read get
# exactly the same time: a true tie. The app decides how close counts as a tie (5 ms by default).
#
# Messages to the app (one per line):
#   GG BUZZ <version> <buttons>   hello, sent at start-up and when asked
#   P <button> <microseconds>     a press while open (only each button's first press)
#   E <button>                    a press while the clue is being read: too early
#   T <button>                    a test press while no clue is open
#   R                             the reset button on the box was pressed
#   PONG                          answer to PING
# Commands from the app:
#   HELLO, PING, IDLE, READY, OPEN, LIGHT <bitmask of buttons to light>

import sys
import select
import time
import machine
from machine import Pin
from micropython import const

VERSION = 1
BUTTON_PINS = (2, 3, 4, 5, 6, 7, 8, 9)  # team buttons 1-8: GP2-GP9, each wired to GND when pressed
LED_PINS = (10, 11, 12, 13, 14, 15, 16, 17)  # their lights: GP10-GP17, through a ULN2803A driver
RESET_PIN = 18  # optional host reset button: GP18 to GND
EARLY_LOCK_US = const(250_000)  # a team that presses too early can't buzz for this long
REPEAT_GAP_US = const(150_000)  # ignore contact bounce between test or early presses
SIO_GPIO_IN = const(0xD0000004)  # all GPIO input levels in one word (RP2040 and RP2350)
TICKS_PERIOD = const(1 << 30)  # MicroPython's ticks_us wraps round after this many microseconds (about 17.9 minutes)

buttons = [Pin(p, Pin.IN, Pin.PULL_UP) for p in BUTTON_PINS]
leds = [Pin(p, Pin.OUT, value=0) for p in LED_PINS]
reset_btn = Pin(RESET_PIN, Pin.IN, Pin.PULL_UP)
try:
    Pin("LED", Pin.OUT).value(1)  # the Pico's own light: on while the program runs
except Exception:
    pass

MASK = 0
for _p in BUTTON_PINS:
    MASK |= 1 << _p
RMASK = 1 << RESET_PIN
N = len(BUTTON_PINS)

IDLE, READY, OPEN = 0, 1, 2
mode = IDLE
opened = time.ticks_us()
got = 0  # buttons already counted since OPEN (bitmask)
locked = [False] * N
lock_until = [0] * N
last = [time.ticks_add(time.ticks_us(), -1_000_000)] * N
last_reset = last[0]


def out(s):
    sys.stdout.write(s + "\n")


def light(mask):
    for i in range(N):
        leds[i].value((mask >> i) & 1)


def command(line):
    global mode, opened, got
    parts = line.split()
    if not parts:
        return
    c = parts[0].upper()
    if c == "HELLO":
        out("GG BUZZ %d %d" % (VERSION, N))
    elif c == "PING":
        out("PONG")
    elif c == "IDLE":
        mode = IDLE
        got = 0
        for i in range(N):
            locked[i] = False
    elif c == "READY":
        mode = READY
        got = 0
    elif c == "OPEN":
        mode = OPEN
        got = 0
        light(0)
        opened = time.ticks_us()
    elif c == "LIGHT" and len(parts) == 2:
        try:
            light(int(parts[1]) & ((1 << N) - 1))
        except ValueError:
            pass


def pressed(i, t):
    global got
    if mode == OPEN:
        if got & (1 << i):
            return
        if locked[i] and time.ticks_diff(lock_until[i], t) > 0:
            return
        first = got == 0
        got |= 1 << i
        if first:
            light(1 << i)  # light the first team at once, before the app even hears
        # ticks_diff only reaches about 9 minutes forward; a press after that comes out negative (which
        # the app would drop), so it is moved one period on. Good for buzzers open up to about 18 minutes.
        us = time.ticks_diff(t, opened)
        if us < 0:
            us += TICKS_PERIOD
        out("P %d %d" % (i, us))
        return
    if time.ticks_diff(t, last[i]) < REPEAT_GAP_US:
        last[i] = t
        return
    last[i] = t
    if mode == READY:
        locked[i] = True
        lock_until[i] = time.ticks_add(t, EARLY_LOCK_US)
        out("E %d" % i)
    else:
        out("T %d" % i)


def main():
    global last_reset
    poller = select.poll()
    poller.register(sys.stdin, select.POLLIN)
    buf = ""
    mem = machine.mem32
    prev = mem[SIO_GPIO_IN]
    n = 0
    out("GG BUZZ %d %d" % (VERSION, N))
    while True:
        now_in = mem[SIO_GPIO_IN]
        fell = prev & ~now_in  # inputs that just went from high to low: pressed
        prev = now_in
        if fell & (MASK | RMASK):
            t = time.ticks_us()
            if fell & RMASK and time.ticks_diff(t, last_reset) > 300_000:
                last_reset = t
                out("R")
            for i in range(N):
                if fell & (1 << BUTTON_PINS[i]):
                    pressed(i, t)
        n += 1
        if n >= 32:  # look for commands now and then, so the buttons are read as often as possible
            n = 0
            while poller.poll(0):
                ch = sys.stdin.read(1)
                if ch in "\r\n":
                    command(buf)
                    buf = ""
                elif len(buf) < 40:
                    buf += ch


main()
