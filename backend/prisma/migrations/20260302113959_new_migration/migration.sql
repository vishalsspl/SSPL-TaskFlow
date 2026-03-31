-- CreateTable
CREATE TABLE "chat_room_last_seen" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_room_last_seen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_room_last_seen_user_id_project_id_key" ON "chat_room_last_seen"("user_id", "project_id");

-- AddForeignKey
ALTER TABLE "chat_room_last_seen" ADD CONSTRAINT "chat_room_last_seen_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_last_seen" ADD CONSTRAINT "chat_room_last_seen_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
