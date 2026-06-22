using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyNote.API.Migrations
{
    /// <inheritdoc />
    public partial class SyncAllFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsCountedInGPA",
                table: "Subjects",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LetterGrade",
                table: "Subjects",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "PassThreshold",
                table: "Subjects",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "PreferencesJson",
                table: "AspNetUsers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CurriculumSubjects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    Credits = table.Column<int>(type: "INTEGER", nullable: true),
                    TermNo = table.Column<int>(type: "INTEGER", nullable: false),
                    ColorHex = table.Column<string>(type: "TEXT", maxLength: 7, nullable: false),
                    PassThreshold = table.Column<double>(type: "REAL", nullable: false),
                    IsCountedInGPA = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CurriculumSubjects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CurriculumSubjects_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GradeItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SubjectId = table.Column<int>(type: "INTEGER", nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Weight = table.Column<double>(type: "REAL", nullable: false),
                    Value = table.Column<double>(type: "REAL", nullable: true),
                    Condition = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GradeItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GradeItems_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CurriculumSubjects_UserId",
                table: "CurriculumSubjects",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_GradeItems_SubjectId",
                table: "GradeItems",
                column: "SubjectId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CurriculumSubjects");

            migrationBuilder.DropTable(
                name: "GradeItems");

            migrationBuilder.DropColumn(
                name: "IsCountedInGPA",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "LetterGrade",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "PassThreshold",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "PreferencesJson",
                table: "AspNetUsers");
        }
    }
}
