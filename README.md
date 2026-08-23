# Pi Gym

A personal A/B workout planner and daily weight tracker built with React,
FastAPI, and SQLite.

## Features

- Separate A and B workouts
- Ordered muscle groups and exercises
- Exercise weight, sets, reps, and personal notes
- Daily body-weight entries with a progress graph
- Edit mode for changing structure, names, and order
- Light and dark themes

Workout data and daily weights are stored by the backend. The selected color
theme is stored only in the current browser.

## First local run

Backend terminal, from the Raspberry Pi workspace root:

```powershell
cd pi-gym\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

Frontend terminal:

```powershell
cd pi-gym\frontend
npm install
npm run dev
```

## Later local runs

Backend terminal:

```powershell
cd pi-gym\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

Frontend terminal:

```powershell
cd pi-gym\frontend
npm run dev
```

Open <http://localhost:5173/gym/> on the computer. On a phone connected to the
same Wi-Fi, open `http://<computer-ip>:5173/gym/`. Find the computer IP with
`ipconfig` and allow Node/Python through Windows Firewall on private networks
if prompted.

API documentation is at <http://127.0.0.1:8002/docs>. The local SQLite database
is created at `pi-gym/backend/data/gym.db` and is excluded from Git. A new,
empty database receives the demo workout and weight data once; existing data is
never replaced on startup.

## Tests

```powershell
cd pi-gym\backend
.\.venv\Scripts\Activate.ps1
python -m unittest discover -s tests -v
```

Frontend checks:

```powershell
cd pi-gym\frontend
npm run lint
npm run build
```

## Deploy

Push `main`, then wait for the
[GitHub Actions build](https://github.com/Evyats/pi-gym/actions) to turn green.
The Pi checks the successful `deploy` branch every five minutes and deploys
new builds automatically. Manual deployment remains available with:

```bash
sudo /opt/pi-gym/app/deploy.sh
```

The first deployment containing the timer must be run manually once. Inspect
the automation with:

```bash
systemctl list-timers pi-gym-update.timer
sudo journalctl -u pi-gym-update.service -n 50 --no-pager
```

The app runs at `/gym/`, its backend listens only on `127.0.0.1:8002`, and its
database lives at `/var/lib/pi-gym/gym.db`.
