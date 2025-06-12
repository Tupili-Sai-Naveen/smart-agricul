if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');

const User = require('./models/user');
const History=require('./models/history');

const app = express();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});



app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'secretkey123',
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get('/', (req, res) => {
  res.render('intro');
});

app.get('/register', (req, res) => {
  res.render('register', { message: req.flash('error') });
});

app.post('/register', async (req, res) => {
  try {
    const user = new User({ username: req.body.username });
    await User.register(user, req.body.password);
    res.redirect('/login');
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/register');
  }
});

app.get('/login', (req, res) => {
  res.render('login', { message: req.flash('error') });
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
  failureFlash: true,
}));

app.get('/intro',(req,res)=>{
  res.render('intro');
})

app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('dashboard', { user: req.user, prediction: null, error: null });
  } else {
    res.redirect('/login');
  }
});


app.get('/history',async(req,res)=>{
  if (req.isAuthenticated()) {
   const history = await History.find({ userId: req.user._id }).sort({ date: -1 });
  res.render('history', { user: req.user, history });
  }
  else {
    res.redirect('/login');
  }
})

app.post('/predict-crop', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  const sensorData = {
    N: parseFloat(req.body.N),
    P: parseFloat(req.body.P),
    K: parseFloat(req.body.K),
    temperature: parseFloat(req.body.temperature),
    humidity: parseFloat(req.body.humidity),
    ph: parseFloat(req.body.ph),
    rainfall: parseFloat(req.body.rainfall),
  };

  const python = spawn('python', ['predict.py']);

  python.stdin.write(JSON.stringify(sensorData));
  python.stdin.end();

  let dataString = '';
  python.stdout.on('data', (data) => {
    dataString += data.toString();
  });

  python.stdout.on('end', async () => {
  try {
    const result = JSON.parse(dataString);
    const prediction = result.prediction;

    const newEntry = new History({
      userId: req.user._id,
      crop: prediction,
      yield: result.yield || 0
    });
    await newEntry.save();

    res.render('result', { user: req.user, prediction: result, error: null });
  } catch (err) {
    console.error('Error parsing prediction result:', err);
    res.render('dashboard', { user: req.user, prediction: null, error: 'Prediction failed. Try again.' });
  }
});

  python.stderr.on('data', (data) => {
    console.error(`Python error: ${data.toString()}`);
  });
});

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
