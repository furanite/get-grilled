# Buzzer box

Big light-up buttons for up to 8 teams, wired to a Raspberry Pi Pico that plugs into the host's
laptop by USB. The game shows who pressed first, the order of everyone after them (to the
thousandth of a second), and any ties. The first team's button lights up and its own buzz sound
plays through the hall speakers.

Works today with the normal web app in **Chrome or Edge on a laptop or desktop** (Web Serial). Safari,
Firefox, iPads and phones can't talk to USB devices. The Raspberry Pi version will read the same box
directly, so nothing changes when you move to it.

## Parts (for 4 teams; add a button, cable run and two driver channels for each extra team, up to 8)

| Part | Qty | Notes |
| --- | --- | --- |
| Raspberry Pi Pico or Pico 2 (with headers) | 1 | Any of them; the W (wireless) versions work too |
| 100 mm arcade push button with built-in light, **12 V** | 4 | One per podium. 5 V versions also work (see Lights) |
| ULN2803A driver chip (DIP-18) + socket | 1 | Switches the 12 V lights from the Pico's 3.3 V pins |
| 12 V 2 A power adapter + DC socket | 1 | For the lights only |
| 4.7 kΩ resistors | 4 | One pull-up per button, for long cables |
| 100 nF ceramic capacitors | 4 | One per button input, filters noise on long cables |
| Small momentary push button | 1 | Optional host Reset on the box |
| CAT6 network cable + RJ45 sockets (or screw terminals) | 1 per podium | Up to about 15 m per podium |
| Project box, perfboard, wire, USB cable for the Pico | 1 | |

## Wiring

Each podium uses one CAT6 cable: one pair for the button, one pair for its light.

| Pico pin | Goes to |
| --- | --- |
| GP2, GP3, GP4, GP5 (… GP9) | Button of team 1, 2, 3, 4 (… 8). The other side of each button goes to GND |
| 3V3 (pin 36) | One 4.7 kΩ resistor to each button pin (GP2–GP9) |
| GND | Each button pin through a 100 nF capacitor, the ULN2803A GND (pin 9), and the 12 V adapter's minus |
| GP10, GP11, GP12, GP13 (… GP17) | ULN2803A inputs 1–4 (… 8) (pins 1–8) |
| GP18 | Optional Reset button, other side to GND |

ULN2803A outputs (pins 18 down to 11) go to the **minus** side of each button light. The **plus** side
of every light and the ULN2803A COM pin (pin 10) go to +12 V.

**Lights:** with 5 V buttons, use the Pico's VBUS (pin 40, 5 V from USB) instead of the 12 V adapter;
keep the total under about 400 mA.

**Same length is not needed:** electricity covers 15 m of cable in well under a microsecond, so a
team on a long cable is not slower.

## Put the program on the Pico

1. Hold the Pico's BOOTSEL button while plugging it into a computer. It shows up as a drive.
2. Download MicroPython for your board from micropython.org (Raspberry Pi Pico, or Pico 2) and drag
   the `.uf2` file onto that drive. The Pico restarts.
3. Install Thonny (thonny.org), open it, and pick "MicroPython (Raspberry Pi Pico)" at the bottom right.
4. Open `buzzer/firmware/main.py` from this repository and use **File → Save as… → Raspberry Pi Pico**,
   saving it as `main.py`. Close Thonny (it holds the USB port while it is open).
5. Unplug and replug the Pico. Its own small light comes on: the program is running.

## Use it in the game

1. Plug the box into the host's laptop and open the game in Chrome or Edge.
2. Press **Buzzers** in the top bar, then **Connect the buzzer box**, and pick the Pico in the list.
   Chrome remembers it, so next time it connects by itself.
3. Press each podium's button: the matching team flashes in the panel and its button lights. If teams
   are mixed up, change the button number next to each team.
4. Open a clue and read it. Press **Open buzzers** (or the **B** key). A team that presses before that
   is locked out for a quarter of a second.
5. The order appears on the clue card and on the audience screen, e.g. `1st Falcons · 2nd Engineers
   +0.084 s`. Teams within the tie window (5 ms by default) show **TIE**.
6. Mark a team wrong and the next team's light comes on. **Re-open buzzers** (or the Reset button on
   the box) clears the order for a re-buzz, for example after a tie.

To rehearse without the box, open the app with `?buzzsim=1` at the end of the address and press
buttons from the browser console with `ggBuzz.press(0)` (team 1), `ggBuzz.press(1)`, and so on.

## How the box talks to the app

Plain text lines over USB serial (115200 baud). See the comment at the top of `firmware/main.py`;
the app's side is `src/lib/buzz.ts` (messages, order and ties) and `src/lib/buzzer.ts` (connection).
