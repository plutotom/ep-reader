# Next.js Template App

A clean, minimal template built with Next.js, tRPC, Drizzle ORM, and Shadcn/ui.

## Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **tRPC** for type-safe API calls
- **Drizzle ORM** for database operations
- **Shadcn/ui** components with Tailwind CSS
- **PostgreSQL** database support

## Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up your database:**
   - Copy `.env.example` to `.env`
   - Update the database connection string
   - Run the database migrations:
     ```bash
     pnpm db:push
     ```

3. **Start the development server:**
   ```bash
   pnpm dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page
│   ├── example/           # Example page with tRPC demo
│   ├── components/        # UI components showcase
│   └── _components/       # Reusable components
├── components/ui/         # Shadcn/ui components
├── server/
│   ├── api/              # tRPC API routes
│   └── db/               # Database schema and connection
└── lib/                   # Utility functions
```

## Pages

- **Home (`/`)** - Main page with CRUD operations example
- **Example (`/example`)** - tRPC query demonstration
- **Components (`/components`)** - UI components showcase

## Database Schema

The template includes a simple `posts` table with:
- `id` (UUID, primary key)
- `name` (text, required)
- `content` (text, optional)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

## API Routes

The template includes a `post` router with:
- `getAll` - Get all posts
- `getById` - Get post by ID
- `create` - Create new post
- `update` - Update existing post
- `delete` - Delete post
- `hello` - Simple greeting example

## Customization

1. **Database Schema**: Modify `src/server/db/schema.ts` to add your tables
2. **API Routes**: Add new routers in `src/server/api/routers/`
3. **Components**: Use Shadcn/ui CLI to add more components
4. **Styling**: Customize Tailwind CSS in `tailwind.config.ts`

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm db:push` - Push database schema changes
- `pnpm db:studio` - Open Drizzle Studio
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)