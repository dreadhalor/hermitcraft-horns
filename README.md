# Hermitcraft Horns
'Sup, yo! In a nutshell, this is a monorepo built with Turborepo.

The 2 major sections of infrastructure are in the `/apps` directory:
1. The primary app, which you interact with, is located in `apps/app` (not very creatively named, but eh). 
   * This is deployed serverlessly with Vercel.
   * The app is built in Next.js 14 with the app router.
   * The API endpoints are created with trpc & accessed through react-query
2. The audio clip creation microservice, in `/apps/ytdl`. It is called `ytdl` because I originally was using the `ytdl` package to extract the audio clips, but then it wasn't working well so I ended up switching it out for the `yt-dlp` package & I never changed the name. 
   * This is running on a node.js/express server.
   * It's deployed on an Amazon EC2 instance.
   * I used a load balancer to handle the reverse proxying SSL shenanigans & set the address of the microservice to a subdomain of the hermitcraft-horns domain.

There's like, a crap ton more but I'm watching a movie & I don't feel like typing anymore so if you have more questions feel free to ask me! Hit me up on reddit at @dreadhalor or... I dunno, I have contact info on the hermitcraft-horns site too. Fun fact, like 60% of this repo was coded while I was watching movies so I've been very distracted the whole time.
