export default function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { password } = req.body;
  const SYSTEM_PASSWORD = process.env.SYSTEM_PASSWORD;

  if (!SYSTEM_PASSWORD) {
    return res.status(500).json({ success: false, message: 'Environment variable not set' });
  }

  if (password === SYSTEM_PASSWORD) {
    return res.status(200).json({ 
        success: true,
        // We could also return a temporary token here if we wanted to be more advanced
        message: 'Authenticated successfully'
    });
  } else {
    return res.status(401).json({ 
        success: false, 
        message: 'Invalid password' 
    });
  }
}
