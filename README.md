# Oposiciones App

Oposiciones App is a web application designed for candidates preparing for competitive exams ("oposiciones") in Spain. It provides an easy-to-use platform to take practice tests and track your progress.

## Features
- Interactive practice tests
- User-friendly interface
- Backend for question management and scoring

## Tech Stack
- **Frontend**: React (JavaScript)
- **Backend**: FastAPI (Python)
- Deployment: [Vercel](https://oposiciones-app.vercel.app)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/olixva/oposiciones-app.git
   ```
2. Navigate to the project directory:
   ```bash
   cd oposiciones-app
   ```
3. Install dependencies for both frontend and backend:
   ```bash
   cd frontend && npm install
   cd ../backend && pip install -r requirements.txt
   ```

## Usage
Start the development servers for frontend and backend:
```bash
# Frontend
npm start

# Backend
uvicorn main:app --reload
```

## Contributing
Feel free to fork the repository and submit pull requests.

## License
This project is currently not licensed.
