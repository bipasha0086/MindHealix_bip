// NotificationManager.js
// Handles hourly motivational notifications

const motivationalMessages = [
  // Heart-warming Notifications
  "Hey, tum jitna sochte ho usse kahin zyada strong ho. Agar dil heavy hai, yahan koi hai jo bina judge kiye sunega.",
  "Kabhi kabhi bas kisi ko ‘sunna’ hi sabse bada support hota hai. Aaj baat karni ho toh main yahan hoon.",
  "Tumhari feelings important hain. Agar stress share karna chaho, koi tumhari baat sunne ke liye ready hai.",

  // Friendly Conversation Invites
  "Dil mein jo chal raha hai, use akela mat sambhalo. Chalo thodi baat karte hain.",
  "Koi stranger bhi kabhi kabhi best listener ban jata hai. Aaj kisi se baat karna chahoge?",
  "Agar aaj ka din thoda tough tha… toh kisi se share kar lo. Shayad dil halka ho jaye.",

  // Motivating + Praise Notifications
  "You’re doing amazing, even if aaj tumhe aisa feel na ho. Agar baat karni ho, safe space ready hai.",
  "Tumhari strength sach mein inspiring hai. Stress ho toh share karo, yahan koi sunne ke liye hai.",
  "Reminder: Tum important ho. Aur tumhari baat bhi.",

  // Soft Check-in Notifications
  "Just a small check-in… tum theek ho? Agar baat karni ho toh yahan koi hai.",
  "Kabhi kabhi bas ‘Hi’ bolna hi shuruat hoti hai. Aaj kisi se connect karna chahoge?",
  "Aaj khud ko thoda credit do… tum already bahut kuch handle kar rahe ho.",

  // Community Feeling Notifications
  "Duniya mein kahin na kahin koi aur bhi hai jo abhi kisi se baat karna chahta hai. Connect karna chahoge?",
  "Kabhi kabhi apni story share karne se kisi aur ko bhi strength milti hai."
];

function getRandomMessage() {
  const idx = Math.floor(Math.random() * motivationalMessages.length);
  return motivationalMessages[idx];
}

export function requestNotificationPermission() {
  if ("Notification" in window) {
    Notification.requestPermission();
  }
}

export function startHourlyNotifications() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  setInterval(() => {
    const message = getRandomMessage();
    new Notification("You are special!", {
      body: message,
      icon: "/public/logo192.png" // Adjust path if needed
    });
  }, 3 * 60 * 1000); // Every 3 minutes
}
