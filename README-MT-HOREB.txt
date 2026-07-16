MT. HOREB VOTING 2026 - SETUP GUIDE
===============================
1. Upload this entire folder to GitHub repo: mt-horeb-voting2026
2. Photos: Save all candidate photos from Google Form into public/images/candidates/
   Use EXACT names from candidates.js:
   - president-kayla-abeja-ongom.jpg
   - president-kirabo-maryanne-hilda.jpg
   - vice-president-austin-lyle-agaba.jpg
   - vice-president-kazibwe-grace-ainebyona.jpg
   - liturgy-jaron-wynn-bulamu.jpg
   - vice-liturgy-alexa-darlene-musunga.jpg
   - academic-alma-mona-kafuko.jpg
   - academic-noella-favour-mirembe.jpg
   - health-kyler-awor-abisag.jpg
   - event-mikisa-avniel.jpg
   - event-isaiah-royal-walusimbi.jpg
   - media-thandiwe-arinda.jpg
   - media-jeremiah-josiah-mwine.jpg
   - cafeteria-martina-mary-namugenyi.jpg
   - assistant-cafeteria-michelle-epitsam-kikobye.jpg
   - uniform-sean-king-muliika.jpg
   - time-keeper-mangeni-jesse-reuben.jpg
   - time-keeper-clara-anne-acere.jpg
   - time-keeper-zion-micheal-ampeire.jpg
   - sports-jeremy-sanyu-kyobe.jpg
   - sports-ahereza-shebah.jpg
   - environment-anabo-hazel.jpg
   - environment-masaba-moses.jpg
   - environment-kironde-darian.jpg

3. In Firebase Console -> Firestore -> create collections:
   - horeb_students : run node createHorebStudents.js once (generates 001-300)
   - horeb_votes (auto)
   - horeb_candidates (auto - will be migrated on first admin login)

4. Netlify: connect repo, build command: npm run build, publish: dist

5. Voting lock: Opens at 4PM automatically. Change VOTING_START_HOUR in App.jsx if needed.

6. Admin password: horeb2026 (change in App.jsx ADMIN_PASSWORD)

7. YES/NO candidates: I made them as YES and NO options sharing same photo.
