import asyncio
from sqlalchemy import select
from app.database.session import _get_session_factory
from app.models.user import User

async def test_connection():
    print("-> Bat dau ket noi den Supabase...")
    
    # Khởi tạo factory để tạo kết nối DB
    factory = _get_session_factory()
    
    async with factory() as session:
        try:
            # 1. Kiem tra ket noi & doc du lieu
            result = await session.execute(select(User))
            users = result.scalars().all()
            print(f"-> Ket noi thanh cong toi Supabase PostgreSQL!")
            print(f"-> So luong nguoi dung hien co trong database: {len(users)}")
            
            # 2. Thu ghi du lieu (Tao 1 tai khoan test neu chua co)
            test_username = "test_supabase_user"
            result = await session.execute(select(User).where(User.username == test_username))
            existing_user = result.scalar_one_or_none()
            
            if not existing_user:
                print(f"-> Dang thu tao mot dong du lieu moi (User: {test_username})...")
                new_user = User(
                    email="test_supabase@example.com",
                    username=test_username,
                    hashed_password="fake_hashed_password",
                    full_name="Supabase Test User"
                )
                session.add(new_user)
                await session.commit()
                print(f"-> Da luu du lieu vao Cloud thanh cong!")
            else:
                print(f"-> User test '{test_username}' da co san trong bang Users. Ghi du lieu hoat dong binh thuong!")
                
            print("-> Moi bai test doc/ghi tren Cloud da hoan tat!")
            
        except Exception as e:
            print(f"-> Loi khi lam viec voi Database: {e}")

if __name__ == "__main__":
    # Ghi đè policy dành cho debug trên Windows nếu có lỗi EventLoop
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(test_connection())
