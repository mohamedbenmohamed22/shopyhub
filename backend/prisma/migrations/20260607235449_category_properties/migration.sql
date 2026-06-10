-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "property_schema" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "properties" JSONB NOT NULL DEFAULT '{}';
