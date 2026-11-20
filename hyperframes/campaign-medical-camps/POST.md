# Swecha free medical camps: donation campaign post kit and sources

Video: `renders/swecha-medical-camps-donate.mp4` (about 55 s, 1080×1920).
Built from `script.json`. Source: Swecha Foundation, *Community Health at Scale: CSR Partnership
Proposal for Monthly Free Multi-Speciality Medical Camps*, September 2026. Cumulative figures are
through the 54th camp, as the proposal states. Call to action: https://ehrs.peoples-health.in/donate

Photos: 19 photos from Swecha's camps, supplied by the team. They show patients, so they are kept
out of this repository (`assets/photos/` is gitignored); put them back as `p01.jpg`–`p19.jpg` to
rebuild. Before posting, confirm the camp's consent practice covers patients' faces in a public
fundraising video; if not, swap the close patient shots (p08, p13, p19) for wide or volunteer shots.

Branding: the Swecha logo (`assets/brand/`, made transparent from the supplied PNG) sits in a
badge at the top left, on the first card and on the end card; a donate strip with the link stays
on screen throughout. The Thanksgiving version adds a "Thanksgiving Giving Drive" tag.

## Every number in the video

| On screen / spoken | Value | Where in the proposal |
|---|---|---|
| Camps completed | 54 | Cover; p. 5 |
| Consultations | 39,549 (spoken "more than 39,000") | Cover; p. 5 |
| Patients, areas | 11,000+ unique patients from 183 areas (Telangana, Andhra Pradesh and nearby borders) | p. 5, Geographic reach |
| Doctors, specialities, volunteers | 60+ doctors in the network; up to 12 specialities; 200+ volunteers per camp | pp. 3, 5, 7 |
| Tests and medicines | 400+ free tests in a camp (blood, thyroid, ECG); up to one month of prescribed medicines; 141 medicine types | pp. 5, 6 |
| Eye care | 2,700 eye check-ups, 810 free spectacles, 34 cataract surgeries | p. 5 |
| End card | 700+ patients at current camp scale; first Sunday of every month; Swecha Office, Gachibowli | pp. 1, 3, 5 |

## Caption / title (under 100 characters)

```
Free medical care every first Sunday in Hyderabad. Help keep it free #Swecha #Donate #Hyderabad
```

## Description

```
On the first Sunday of every month, Swecha Foundation runs a free multi-speciality medical camp at the Swecha Office in Gachibowli, Hyderabad.

So far (through the 54th camp):
• 54 camps and 39,549 consultations
• 11,000+ patients from 183 areas across Telangana, Andhra Pradesh and beyond
• 60+ doctors, up to 12 specialities, and 200+ volunteers at every camp
• 400+ free tests in a camp, and up to a month of prescribed medicines from a 141-type formulary
• 2,700 eye check-ups, 810 free spectacles and 34 cataract surgeries

Your donation keeps these camps free, month after month.

Donate: https://ehrs.peoples-health.in/donate

Figures from Swecha Foundation's 2026 programme proposal. Photos from Swecha's camps.
Voice: AI text-to-speech (Indian English). Music: original.

#Swecha #MedicalCamp #Hyderabad #Donate #CommunityHealth
```

## Pinned comment

```
Every camp serves 700+ patients. Every share helps as much as every rupee 🙏
Donate: https://ehrs.peoples-health.in/donate
```

## Before posting

- [ ] Watch once with sound.
- [ ] Confirm consent for patients' faces (see Photos above).
- [ ] Check the donate link opens on a phone.

---

# Thanksgiving version (donation drive)

Video: `renders/swecha-medical-camps-thanksgiving.mp4` (57 s, 1080×1920). Built from
`script-thanks.json`: a Thanksgiving giving-season appeal to individuals and companies. Story:
the need (free care every month) → proof (54 camps, 11,000+ patients) → what a donation provides
(tests, medicines, eye care) → a CSR pitch to companies (sponsor one camp or partner for a year,
as the proposal offers) → "Donate this Thanksgiving". No rupee amounts. Autumn rust-and-gold
theme with handwritten headlines (Caveat, SIL OFL). Photo styles: mosaic, polaroids, split
screen, pans, circle wipes, push and pull. Music: `lib/music.py --style warm` (original: G major
I–V–vi–IV at 84 BPM, piano arpeggio, melody, soft bass, light shaker).

The end card gives the CSR contact from the proposal's cover (manager@swecha.net); change it in
`script-thanks.json` → `end.lines` if companies should write elsewhere.

## When to post

- Thanksgiving Day is Thursday 26 November 2026; #GivingTuesday is Tuesday 1 December 2026.
- Post by 24 November and pin it; share again on 26 November and on 1 December (#GivingTuesday).
- For companies, send the video with the CSR proposal PDF.

## Caption / title (under 100 characters)

```
This Thanksgiving, give the gift of free medical care 🙏 Donate to Swecha #GivingTuesday
```

## Description

```
This Thanksgiving, as people and companies choose where to give, choose free medical care for families who need it most.

Every first Sunday, Swecha Foundation runs a free multi-speciality medical camp at the Swecha Office, Gachibowli, Hyderabad.

It works: 54 camps so far, 39,549 consultations and 11,000+ patients from 183 areas.

Your donation provides:
• Free tests: 400+ in a camp, including blood tests, thyroid tests and ECGs
• Up to a month of prescribed medicines for each patient
• Eye care: 810 free spectacles and 34 cataract surgeries so far

Individuals: donate today → https://ehrs.peoples-health.in/donate
Companies: sponsor a camp or partner with us for the year (CSR) → manager@swecha.net

Figures from Swecha Foundation's 2026 programme proposal (through the 54th camp). Photos from Swecha's camps.
Voice: AI text-to-speech (Indian English). Music: original.

#Thanksgiving #GivingTuesday #Swecha #MedicalCamp #Hyderabad #CSR
```

## Pinned comment

```
This Thanksgiving, one share can bring a donor 🙏 Please donate or pass it on:
https://ehrs.peoples-health.in/donate
Companies: sponsor a camp → manager@swecha.net
```
