## Deployment (Railway.app)

1. **Project Setup:** Create a new project in Railway.
2. **Database:** Add a PostgreSQL service.
3. **Services:**
   - Add a Web Service pointing to `/backend`.
   - Add a Web Service pointing to `/frontend`.
4. **Environment Variables:**
   - **Backend:** `DATABASE_URL`, `STORAGE=cloudinary`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `JWT_SECRET`.
   - **Frontend:** `NEXT_PUBLIC_API_URL` (Backend URL), `NEXTAUTH_URL` (Frontend URL), `NEXTAUTH_SECRET`.
