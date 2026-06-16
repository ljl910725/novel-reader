import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Prisma BigInt columns must not break JSON responses if a handler returns raw rows.
if (!(BigInt.prototype as { toJSON?: () => unknown }).toJSON) {
  Object.defineProperty(BigInt.prototype, 'toJSON', {
    value(this: bigint): number {
      return Number(this);
    },
    configurable: true,
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
    credentials: true,
  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`NovelReader API running on http://localhost:${port}`);
}
bootstrap();
